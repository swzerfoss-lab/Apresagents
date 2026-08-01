/**
 * ContentStorage
 *
 * Manages persistent storage for weekly workflows, posts, and generated assets.
 * Uses file-based JSON storage for simplicity - can be replaced with a database.
 */

import fs from 'fs/promises';
import path from 'path';
import { WeeklyWorkflow, ReadyPost, GeneratedAsset, PlannedPost, WorkflowError } from '../types/index.js';

export class ContentStorage {
  private static workflowWriteQueues = new Map<string, Promise<void>>();

  private storageDir: string;
  private workflowsFile: string;
  private postsDir: string;
  private assetsDir: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(baseDir?: string) {
    this.storageDir = baseDir || path.join(process.cwd(), 'data', 'content');
    this.workflowsFile = path.join(this.storageDir, 'workflows.json');
    this.postsDir = path.join(this.storageDir, 'posts');
    this.assetsDir = path.join(this.storageDir, 'assets');
    // Start async initialization in background (non-blocking)
    this.initPromise = this.initializeStorage();
  }

  /**
   * Ensure storage is initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize storage directories (async version for compatibility)
   */
  private async initializeStorage(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.postsDir, { recursive: true });
      await fs.mkdir(this.assetsDir, { recursive: true });
      await fs.mkdir(path.join(this.assetsDir, 'images'), { recursive: true });
      await fs.mkdir(path.join(this.assetsDir, 'videos'), { recursive: true });

      await this.createWorkflowsFileIfMissing();
      this.initialized = true;
      console.log('📁 Content storage initialized at:', this.storageDir);
    } catch (error) {
      console.error('Error initializing storage:', error);
      throw error; // Re-throw to ensure callers know initialization failed
    }
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(workflow: WeeklyWorkflow): Promise<void> {
    await this.withWorkflowWriteLock(async () => {
      await this.ensureInitialized();
      const data = await this.loadWorkflowsData();
      const existingIndex = data.workflows.findIndex((w: WeeklyWorkflow) => w.id === workflow.id);

      if (existingIndex >= 0) {
        data.workflows[existingIndex] = workflow;
      } else {
        data.workflows.push(workflow);
      }

      await this.writeWorkflowsData(data);
    });

    // Also save individual post files for quick access
    for (const post of workflow.posts) {
      await this.savePost(post);
    }
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows(): Promise<WeeklyWorkflow[]> {
    const data = await this.loadWorkflowsData();
    return data.workflows
      .map(this.deserializeWorkflow)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<WeeklyWorkflow | null> {
    const data = await this.loadWorkflowsData();
    const workflow = data.workflows.find((w: WeeklyWorkflow) => w.id === id);
    return workflow ? this.deserializeWorkflow(workflow) : null;
  }

  /**
   * Get latest workflow
   */
  async getLatestWorkflow(): Promise<WeeklyWorkflow | null> {
    const data = await this.loadWorkflowsData();
    if (data.workflows.length === 0) return null;

    const sorted = data.workflows.sort(
      (a: WeeklyWorkflow, b: WeeklyWorkflow) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return this.deserializeWorkflow(sorted[0]);
  }

  /**
   * Get workflows for a specific week
   */
  async getWorkflowsForWeek(weekStart: Date): Promise<WeeklyWorkflow[]> {
    const data = await this.loadWorkflowsData();
    return data.workflows
      .filter((w: WeeklyWorkflow) => {
        const wStart = new Date(w.weekStartDate);
        return wStart.toDateString() === weekStart.toDateString();
      })
      .map(this.deserializeWorkflow);
  }

  /**
   * Save a post
   */
  async savePost(post: ReadyPost): Promise<void> {
    await this.ensureInitialized();
    const postFile = path.join(this.postsDir, `${post.id}.json`);
    await fs.writeFile(postFile, JSON.stringify(post, null, 2));
  }

  /**
   * Get post by ID
   */
  async getPost(id: string): Promise<ReadyPost | null> {
    try {
      await this.ensureInitialized();
      const postFile = path.join(this.postsDir, `${id}.json`);
      const content = await fs.readFile(postFile, 'utf-8');
      return this.deserializePost(JSON.parse(content));
    } catch {
      return null;
    }
  }

  /**
   * Get all posts for a workflow
   */
  async getPostsForWorkflow(workflowId: string): Promise<ReadyPost[]> {
    const workflow = await this.getWorkflow(workflowId);
    return workflow?.posts || [];
  }

  /**
   * Get posts by status
   */
  async getPostsByStatus(status: ReadyPost['status']): Promise<ReadyPost[]> {
    const workflows = await this.getAllWorkflows();
    const allPosts: ReadyPost[] = [];

    for (const workflow of workflows) {
      const matchingPosts = workflow.posts.filter((p) => p.status === status);
      allPosts.push(...matchingPosts);
    }

    return allPosts;
  }

  /**
   * Get posts scheduled for a specific date
   */
  async getPostsForDate(date: Date): Promise<ReadyPost[]> {
    const workflows = await this.getAllWorkflows();
    const allPosts: ReadyPost[] = [];

    for (const workflow of workflows) {
      const matchingPosts = workflow.posts.filter(
        (p) => new Date(p.scheduledDate).toDateString() === date.toDateString()
      );
      allPosts.push(...matchingPosts);
    }

    return allPosts;
  }

  /**
   * Get posts for a date range
   */
  async getPostsForDateRange(startDate: Date, endDate: Date): Promise<ReadyPost[]> {
    const workflows = await this.getAllWorkflows();
    const allPosts: ReadyPost[] = [];

    for (const workflow of workflows) {
      const matchingPosts = workflow.posts.filter((p) => {
        const postDate = new Date(p.scheduledDate);
        return postDate >= startDate && postDate <= endDate;
      });
      allPosts.push(...matchingPosts);
    }

    return allPosts.sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  /**
   * Update post status
   */
  async updatePostStatus(
    postId: string,
    status: ReadyPost['status'],
    timestamp?: Date
  ): Promise<boolean> {
    let postsToSave: ReadyPost[] | undefined;
    const updated = await this.withWorkflowWriteLock(async () => {
      const data = await this.loadWorkflowsData();

      for (const workflow of data.workflows) {
        const post = workflow.posts.find((p) => p.id === postId);
        if (!post) {
          continue;
        }

        post.status = status;
        if (status === 'approved') {
          post.approvedAt = timestamp || new Date();
        } else if (status === 'published') {
          post.publishedAt = timestamp || new Date();
        }

        postsToSave = workflow.posts;
        await this.writeWorkflowsData(data);
        return true;
      }

      return false;
    });

    if (updated && postsToSave) {
      for (const post of postsToSave) {
        await this.savePost(post);
      }
    }

    return updated;
  }

  /**
   * Save generated asset file
   */
  async saveAsset(
    asset: GeneratedAsset,
    data: Buffer,
    extension: string
  ): Promise<string> {
    await this.ensureInitialized();
    const subDir = asset.type === 'image' ? 'images' : 'videos';
    const filename = `${asset.id}.${extension}`;
    const filePath = path.join(this.assetsDir, subDir, filename);

    await fs.writeFile(filePath, data);
    return filePath;
  }

  /**
   * Get asset file path
   */
  getAssetPath(assetId: string, type: 'image' | 'video', extension: string): string {
    const subDir = type === 'image' ? 'images' : 'videos';
    return path.join(this.assetsDir, subDir, `${assetId}.${extension}`);
  }

  /**
   * Delete old workflows (cleanup)
   */
  async deleteOldWorkflows(daysToKeep: number = 90): Promise<number> {
    return this.withWorkflowWriteLock(async () => {
      const data = await this.loadWorkflowsData();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const originalCount = data.workflows.length;
      data.workflows = data.workflows.filter(
        (w: WeeklyWorkflow) => new Date(w.createdAt) > cutoffDate
      );

      await this.writeWorkflowsData(data);
      return originalCount - data.workflows.length;
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalWorkflows: number;
    totalPosts: number;
    postsByStatus: Record<string, number>;
    totalImages: number;
    totalVideos: number;
  }> {
    const workflows = await this.getAllWorkflows();
    const postsByStatus: Record<string, number> = {
      draft: 0,
      ready: 0,
      approved: 0,
      published: 0,
      failed: 0,
    };

    let totalImages = 0;
    let totalVideos = 0;

    for (const workflow of workflows) {
      for (const post of workflow.posts) {
        postsByStatus[post.status] = (postsByStatus[post.status] || 0) + 1;
        totalImages += post.images.filter((i) => i.status === 'completed').length;
        totalVideos += post.videos.filter((v) => v.status === 'completed').length;
      }
    }

    return {
      totalWorkflows: workflows.length,
      totalPosts: workflows.reduce((acc, w) => acc + w.posts.length, 0),
      postsByStatus,
      totalImages,
      totalVideos,
    };
  }

  /**
   * Recover workflows left in a persisted in-between state by a process restart.
   */
  async recoverInterruptedWorkflows(now: Date = new Date()): Promise<WeeklyWorkflow[]> {
    let recoveredWorkflows: WeeklyWorkflow[] = [];

    await this.withWorkflowWriteLock(async () => {
      const data = await this.loadWorkflowsData();
      let changed = false;

      for (const workflow of data.workflows) {
        const recoveryPlan = this.getRecoveryPlan(workflow);
        const resetAssets = this.resetGeneratingAssets(workflow);
        if (!recoveryPlan) {
          if (resetAssets) {
            recoveredWorkflows.push(workflow);
            changed = true;
          }
          continue;
        }

        workflow.errors = workflow.errors || [];
        workflow.stageApprovals = workflow.stageApprovals || [];

        workflow.errors.push({
          stage: recoveryPlan.interruptedStage,
          message: recoveryPlan.message,
          timestamp: now,
          recoverable: recoveryPlan.recoverable,
        });

        if (recoveryPlan.retryApprovalStage) {
          workflow.currentStage = recoveryPlan.retryApprovalStage;
          workflow.status = 'awaiting-approval';
          workflow.awaitingApproval = true;
          workflow.stageApprovals = workflow.stageApprovals.filter(
            (approval) => approval.stage !== recoveryPlan.retryApprovalStage
          );

          if (recoveryPlan.resetCopywritingOutput) {
            workflow.posts = [];
            workflow.metrics.postsCompleted = 0;
            workflow.metrics.imagesGenerated = 0;
            workflow.metrics.videosGenerated = 0;
          }
        } else {
          workflow.status = 'failed';
          workflow.awaitingApproval = false;
        }

        recoveredWorkflows.push(workflow);
        changed = true;
      }

      if (changed) {
        await this.writeWorkflowsData(data);
      }
    });

    for (const workflow of recoveredWorkflows) {
      for (const post of workflow.posts) {
        await this.savePost(post);
      }
    }

    recoveredWorkflows = recoveredWorkflows.map(this.deserializeWorkflow);
    return recoveredWorkflows;
  }

  // Private helper methods

  private async loadWorkflowsData(): Promise<{ workflows: WeeklyWorkflow[] }> {
    try {
      await this.ensureInitialized();
      const content = await fs.readFile(this.workflowsFile, 'utf-8');
      const parsed = JSON.parse(content);

      if (!parsed || !Array.isArray(parsed.workflows)) {
        throw new Error(`Invalid workflows storage format in ${this.workflowsFile}`);
      }

      return parsed;
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        return { workflows: [] };
      }

      throw error;
    }
  }

  private async writeWorkflowsData(data: { workflows: WeeklyWorkflow[] }): Promise<void> {
    const tempFile = `${this.workflowsFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
    await fs.rename(tempFile, this.workflowsFile);
  }

  private async createWorkflowsFileIfMissing(): Promise<void> {
    try {
      await fs.writeFile(this.workflowsFile, JSON.stringify({ workflows: [] }, null, 2), {
        flag: 'wx',
      });
    } catch (error) {
      if (this.isFileAlreadyExistsError(error)) {
        return;
      }

      throw error;
    }
  }

  private async withWorkflowWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = ContentStorage.workflowWriteQueues.get(this.workflowsFile) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.catch(() => undefined).then(() => current);
    ContentStorage.workflowWriteQueues.set(this.workflowsFile, queued);

    await previous.catch(() => undefined);

    try {
      return await operation();
    } finally {
      release();
      if (ContentStorage.workflowWriteQueues.get(this.workflowsFile) === queued) {
        ContentStorage.workflowWriteQueues.delete(this.workflowsFile);
      }
    }
  }

  private isFileNotFoundError(error: unknown): boolean {
    return this.hasErrorCode(error, 'ENOENT');
  }

  private isFileAlreadyExistsError(error: unknown): boolean {
    return this.hasErrorCode(error, 'EEXIST');
  }

  private hasErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === code
    );
  }

  private getRecoveryPlan(workflow: WeeklyWorkflow): {
    interruptedStage: WeeklyWorkflow['currentStage'];
    retryApprovalStage: WeeklyWorkflow['currentStage'] | null;
    message: string;
    recoverable: boolean;
    resetCopywritingOutput: boolean;
  } | null {
    if (workflow.status === 'running') {
      const interruptedStage = workflow.currentStage;

      // Copywriting checkpoints each post before flipping to awaiting-approval.
      // If every planned post is already persisted, promote instead of discarding.
      if (interruptedStage === 'copywriting' && this.isCopywritingOutputComplete(workflow)) {
        return {
          interruptedStage,
          retryApprovalStage: 'copywriting',
          message:
            'Workflow was interrupted after copywriting finished; restored awaiting-approval so generated posts are not discarded.',
          recoverable: true,
          resetCopywritingOutput: false,
        };
      }

      const retryApprovalStage = this.getRetryApprovalStage(interruptedStage);

      return {
        interruptedStage,
        retryApprovalStage,
        message: retryApprovalStage
          ? `Workflow was interrupted while ${interruptedStage} was running; rolled back to ${retryApprovalStage} approval so the stage can be retried.`
          : `Workflow was interrupted while ${interruptedStage} was running; marked failed so a new workflow can be started.`,
        recoverable: Boolean(retryApprovalStage),
        // Keep partial copywriting posts; executeCopywritingStage skips existing IDs.
        resetCopywritingOutput: false,
      };
    }

    if (!workflow.awaitingApproval) {
      const approvalStage = this.getInterruptedApprovalHandoffStage(workflow.status);
      if (approvalStage) {
        return {
          interruptedStage: approvalStage,
          retryApprovalStage: approvalStage,
          message: `Workflow was interrupted after ${approvalStage} approval before the next stage started; rolled back to ${approvalStage} approval so the stage transition can be retried.`,
          recoverable: true,
          resetCopywritingOutput: false,
        };
      }
    }

    return null;
  }

  private getRetryApprovalStage(stage: WeeklyWorkflow['currentStage']): WeeklyWorkflow['currentStage'] | null {
    switch (stage) {
      case 'copywriting':
        return 'strategy';
      case 'image-generation':
        return 'copywriting';
      case 'video-generation':
        return 'image-generation';
      case 'assembly':
        return 'video-generation';
      case 'strategy':
        return null;
    }
  }

  private getInterruptedApprovalHandoffStage(
    status: WeeklyWorkflow['status']
  ): WeeklyWorkflow['currentStage'] | null {
    switch (status) {
      case 'strategy-complete':
        return 'strategy';
      case 'copywriting-complete':
        return 'copywriting';
      case 'images-complete':
        return 'image-generation';
      case 'videos-complete':
        return 'video-generation';
      case 'assembly-complete':
        return 'assembly';
      default:
        return null;
    }
  }

  private resetGeneratingAssets(workflow: WeeklyWorkflow): boolean {
    let reset = false;

    for (const post of workflow.posts) {
      for (const asset of [...post.images, ...post.videos]) {
        if (asset.status === 'generating') {
          // Manual regeneration marks a completed asset generating while keeping its
          // prior url/filePath. Restore completed so a crash cannot demote paid media.
          // First-time generation has no media yet, so return it to pending.
          asset.status = asset.url || asset.filePath ? 'completed' : 'pending';
          reset = true;
        }
      }
    }

    return reset;
  }

  private isCopywritingOutputComplete(workflow: WeeklyWorkflow): boolean {
    const plannedPosts = workflow.strategy?.posts;
    if (!plannedPosts || plannedPosts.length === 0) {
      return false;
    }

    const existingIds = new Set(workflow.posts.map((post) => post.id));
    return plannedPosts.every((plannedPost) => existingIds.has(plannedPost.id));
  }

  private deserializeWorkflow = (workflow: WeeklyWorkflow): WeeklyWorkflow => {
    return {
      ...workflow,
      weekStartDate: new Date(workflow.weekStartDate),
      weekEndDate: new Date(workflow.weekEndDate),
      createdAt: new Date(workflow.createdAt),
      completedAt: workflow.completedAt ? new Date(workflow.completedAt) : undefined,
      strategy: workflow.strategy
        ? {
            ...workflow.strategy,
            posts: workflow.strategy.posts.map((post) => this.deserializePlannedPost(post)),
          }
        : undefined,
      posts: workflow.posts.map((post) => this.deserializePost(post)),
      errors: workflow.errors.map((error) => this.deserializeWorkflowError(error)),
      metrics: {
        ...workflow.metrics,
        startTime: workflow.metrics.startTime ? new Date(workflow.metrics.startTime) : undefined,
        endTime: workflow.metrics.endTime ? new Date(workflow.metrics.endTime) : undefined,
      },
      // Ensure new fields have defaults
      stageApprovals: (workflow.stageApprovals || []).map(approval => ({
        ...approval,
        approvedAt: approval.approvedAt ? new Date(approval.approvedAt) : undefined,
      })),
      awaitingApproval: workflow.awaitingApproval ?? false,
    };
  };

  private deserializePost = (post: ReadyPost): ReadyPost => {
    return {
      ...post,
      scheduledDate: new Date(post.scheduledDate),
      images: post.images.map((asset) => this.deserializeAsset(asset)),
      videos: post.videos.map((asset) => this.deserializeAsset(asset)),
      createdAt: new Date(post.createdAt),
      approvedAt: post.approvedAt ? new Date(post.approvedAt) : undefined,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
    };
  };

  private deserializePlannedPost = (post: PlannedPost): PlannedPost => ({
    ...post,
    scheduledDate: new Date(post.scheduledDate),
  });

  private deserializeAsset = (asset: GeneratedAsset): GeneratedAsset => ({
    ...asset,
    generatedAt: asset.generatedAt ? new Date(asset.generatedAt) : undefined,
  });

  private deserializeWorkflowError = (error: WorkflowError): WorkflowError => ({
    ...error,
    timestamp: new Date(error.timestamp),
  });
}

export default ContentStorage;
