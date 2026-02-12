/**
 * ContentStorage
 *
 * Manages persistent storage for weekly workflows, posts, and generated assets.
 * Uses file-based JSON storage for simplicity - can be replaced with a database.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { WeeklyWorkflow, ReadyPost, GeneratedAsset } from '../types/index.js';

export class ContentStorage {
  private storageDir: string;
  private workflowsFile: string;
  private postsDir: string;
  private assetsDir: string;
  private initialized: boolean = false;

  constructor(baseDir?: string) {
    this.storageDir = baseDir || path.join(process.cwd(), 'data', 'content');
    this.workflowsFile = path.join(this.storageDir, 'workflows.json');
    this.postsDir = path.join(this.storageDir, 'posts');
    this.assetsDir = path.join(this.storageDir, 'assets');
    // Use synchronous initialization to ensure directories exist immediately
    this.initializeStorageSync();
  }

  /**
   * Initialize storage directories synchronously
   */
  private initializeStorageSync(): void {
    try {
      fsSync.mkdirSync(this.storageDir, { recursive: true });
      fsSync.mkdirSync(this.postsDir, { recursive: true });
      fsSync.mkdirSync(this.assetsDir, { recursive: true });
      fsSync.mkdirSync(path.join(this.assetsDir, 'images'), { recursive: true });
      fsSync.mkdirSync(path.join(this.assetsDir, 'videos'), { recursive: true });

      // Initialize workflows file if it doesn't exist
      if (!fsSync.existsSync(this.workflowsFile)) {
        fsSync.writeFileSync(this.workflowsFile, JSON.stringify({ workflows: [] }, null, 2));
      }
      this.initialized = true;
      console.log('📁 Content storage initialized at:', this.storageDir);
    } catch (error) {
      console.error('Error initializing storage:', error);
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

      // Initialize workflows file if it doesn't exist
      try {
        await fs.access(this.workflowsFile);
      } catch {
        await fs.writeFile(this.workflowsFile, JSON.stringify({ workflows: [] }, null, 2));
      }
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(workflow: WeeklyWorkflow): Promise<void> {
    const data = await this.loadWorkflowsData();
    const existingIndex = data.workflows.findIndex((w: WeeklyWorkflow) => w.id === workflow.id);

    if (existingIndex >= 0) {
      data.workflows[existingIndex] = workflow;
    } else {
      data.workflows.push(workflow);
    }

    await fs.writeFile(this.workflowsFile, JSON.stringify(data, null, 2));

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
    return data.workflows.map(this.deserializeWorkflow);
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
    const postFile = path.join(this.postsDir, `${post.id}.json`);
    await fs.writeFile(postFile, JSON.stringify(post, null, 2));
  }

  /**
   * Get post by ID
   */
  async getPost(id: string): Promise<ReadyPost | null> {
    try {
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
    const workflows = await this.getAllWorkflows();

    for (const workflow of workflows) {
      const post = workflow.posts.find((p) => p.id === postId);
      if (post) {
        post.status = status;
        if (status === 'approved') {
          post.approvedAt = timestamp || new Date();
        } else if (status === 'published') {
          post.publishedAt = timestamp || new Date();
        }
        await this.saveWorkflow(workflow);
        return true;
      }
    }

    return false;
  }

  /**
   * Save generated asset file
   */
  async saveAsset(
    asset: GeneratedAsset,
    data: Buffer,
    extension: string
  ): Promise<string> {
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
    const data = await this.loadWorkflowsData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalCount = data.workflows.length;
    data.workflows = data.workflows.filter(
      (w: WeeklyWorkflow) => new Date(w.createdAt) > cutoffDate
    );

    await fs.writeFile(this.workflowsFile, JSON.stringify(data, null, 2));
    return originalCount - data.workflows.length;
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

  // Private helper methods

  private async loadWorkflowsData(): Promise<{ workflows: WeeklyWorkflow[] }> {
    try {
      await this.initializeStorage();
      const content = await fs.readFile(this.workflowsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { workflows: [] };
    }
  }

  private deserializeWorkflow = (workflow: WeeklyWorkflow): WeeklyWorkflow => {
    return {
      ...workflow,
      weekStartDate: new Date(workflow.weekStartDate),
      weekEndDate: new Date(workflow.weekEndDate),
      createdAt: new Date(workflow.createdAt),
      completedAt: workflow.completedAt ? new Date(workflow.completedAt) : undefined,
      posts: workflow.posts.map((post) => this.deserializePost(post)),
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
      createdAt: new Date(post.createdAt),
      approvedAt: post.approvedAt ? new Date(post.approvedAt) : undefined,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
    };
  };
}

export default ContentStorage;
