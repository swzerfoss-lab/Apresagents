import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { WeeklyWorkflowOrchestrator } from '../src/agents/WeeklyWorkflowOrchestrator.js';
import { ContentStorage } from '../src/storage/ContentStorage.js';
import type { BrandConfig, WeeklyWorkflow } from '../src/types/index.js';

const brandConfig: BrandConfig = {
  name: 'Test Brand',
  description: 'A test brand for unit testing',
  tone: ['professional', 'friendly'],
  targetAudience: 'Test audience',
  keywords: ['test', 'brand'],
};

function createWorkflow(overrides: Partial<WeeklyWorkflow> = {}): WeeklyWorkflow {
  const originalGeneratedAt = new Date('2026-01-01T00:00:00.000Z');
  const workflow: WeeklyWorkflow = {
    id: 'workflow-1',
    weekStartDate: new Date('2026-01-05T00:00:00.000Z'),
    weekEndDate: new Date('2026-01-11T00:00:00.000Z'),
    status: 'awaiting-approval',
    currentStage: 'image-generation',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    posts: [
      {
        id: 'post-1',
        workflowId: 'workflow-1',
        platform: 'instagram',
        contentType: 'post',
        category: 'educational',
        scheduledDate: new Date('2026-01-06T00:00:00.000Z'),
        scheduledTime: '09:00',
        status: 'draft',
        caption: 'Original caption',
        hashtags: ['test'],
        callToAction: 'Learn more',
        images: [
          {
            id: 'asset-1',
            postId: 'post-1',
            type: 'image',
            prompt: 'original prompt',
            url: '/api/assets/images/original.png',
            filePath: '/tmp/original.png',
            status: 'completed',
            generatedAt: originalGeneratedAt,
            metadata: { source: 'original' },
          },
        ],
        videos: [],
        platformFormatting: {
          platform: 'instagram',
          formattedCaption: 'Original caption',
          formattedHashtags: '#test',
          characterCount: 16,
          hashtagCount: 1,
          aspectRatio: '1:1',
          additionalNotes: [],
          isWithinLimits: true,
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    errors: [],
    metrics: {
      totalPosts: 1,
      postsCompleted: 1,
      imagesGenerated: 1,
      videosGenerated: 0,
    },
    stageApprovals: [],
    awaitingApproval: true,
  };

  return {
    ...workflow,
    ...overrides,
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('WeeklyWorkflowOrchestrator asset regeneration', () => {
  let tempDir: string;
  let storage: ContentStorage;
  let orchestrator: WeeklyWorkflowOrchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-regeneration-'));
    storage = new ContentStorage(tempDir);
    orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);

    const testOrchestrator = orchestrator as unknown as {
      storage: ContentStorage;
      assetsDir: string;
      visualAgent: { generateImage: ReturnType<typeof vi.fn> };
    };
    testOrchestrator.storage = storage;
    testOrchestrator.assetsDir = path.join(tempDir, 'assets');
    testOrchestrator.visualAgent = {
      generateImage: vi.fn().mockResolvedValue({
        success: false,
        error: 'provider unavailable',
      }),
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('preserves the existing asset when regeneration fails', async () => {
    const originalGeneratedAt = new Date('2026-01-01T00:00:00.000Z');
    const workflow: WeeklyWorkflow = {
      id: 'workflow-1',
      weekStartDate: new Date('2026-01-05T00:00:00.000Z'),
      weekEndDate: new Date('2026-01-11T00:00:00.000Z'),
      status: 'awaiting-approval',
      currentStage: 'image-generation',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      posts: [
        {
          id: 'post-1',
          workflowId: 'workflow-1',
          platform: 'instagram',
          contentType: 'post',
          category: 'educational',
          scheduledDate: new Date('2026-01-06T00:00:00.000Z'),
          scheduledTime: '09:00',
          status: 'draft',
          caption: 'Original caption',
          hashtags: ['test'],
          callToAction: 'Learn more',
          images: [
            {
              id: 'asset-1',
              postId: 'post-1',
              type: 'image',
              prompt: 'original prompt',
              url: '/api/assets/images/original.png',
              filePath: '/tmp/original.png',
              status: 'completed',
              generatedAt: originalGeneratedAt,
              metadata: { source: 'original' },
            },
          ],
          videos: [],
          platformFormatting: {
            platform: 'instagram',
            formattedCaption: 'Original caption',
            formattedHashtags: '#test',
            characterCount: 16,
            hashtagCount: 1,
            aspectRatio: '1:1',
            additionalNotes: [],
            isWithinLimits: true,
          },
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      errors: [],
      metrics: {
        totalPosts: 1,
        postsCompleted: 1,
        imagesGenerated: 1,
        videosGenerated: 0,
      },
      stageApprovals: [],
      awaitingApproval: true,
    };

    await storage.saveWorkflow(workflow);

    await expect(
      orchestrator.regenerateAsset('workflow-1', {
        assetId: 'asset-1',
        postId: 'post-1',
        newPrompt: 'replacement prompt',
        type: 'image',
      })
    ).rejects.toThrow('provider unavailable');

    const savedWorkflow = await storage.getWorkflow('workflow-1');
    const savedAsset = savedWorkflow?.posts[0].images[0];
    expect(savedAsset).toMatchObject({
      prompt: 'original prompt',
      url: '/api/assets/images/original.png',
      filePath: '/tmp/original.png',
      status: 'completed',
      metadata: { source: 'original' },
    });
    expect(savedAsset?.generatedAt).toEqual(originalGeneratedAt);
  });

  it('rejects manual post edits while a workflow stage is running', async () => {
    const workflow = createWorkflow({
      status: 'running',
      currentStage: 'image-generation',
      awaitingApproval: false,
    });
    await storage.saveWorkflow(workflow);

    await expect(
      orchestrator.editPostContent('workflow-1', {
        postId: 'post-1',
        caption: 'Updated while images generate',
      })
    ).rejects.toThrow('Cannot modify workflow content while a stage is running');

    const savedWorkflow = await storage.getWorkflow('workflow-1');
    expect(savedWorkflow?.posts[0].caption).toBe('Original caption');
  });

  it('does not let an in-flight workflow mutation overwrite a post status update', async () => {
    const workflow = createWorkflow({
      status: 'awaiting-approval',
      currentStage: 'image-generation',
      awaitingApproval: true,
    });
    await storage.saveWorkflow(workflow);

    const generateResult = createDeferred<{
      success: true;
      data: {
        filePath: string;
        prompt: string;
      };
    }>();
    const generateStarted = createDeferred<void>();
    const testOrchestrator = orchestrator as unknown as {
      visualAgent: { generateImage: ReturnType<typeof vi.fn> };
    };
    testOrchestrator.visualAgent = {
      generateImage: vi.fn(() => {
        generateStarted.resolve();
        return generateResult.promise;
      }),
    };

    const regeneration = orchestrator.regenerateAsset('workflow-1', {
      assetId: 'asset-1',
      postId: 'post-1',
      newPrompt: 'replacement prompt',
      type: 'image',
    });
    await generateStarted.promise;

    let statusUpdateSettled = false;
    const approvedAt = new Date('2026-01-02T00:00:00.000Z');
    const statusUpdate = orchestrator
      .updatePostStatus('post-1', 'approved', approvedAt)
      .then((result) => {
        statusUpdateSettled = true;
        return result;
      });

    await Promise.resolve();
    expect(statusUpdateSettled).toBe(false);

    generateResult.resolve({
      success: true,
      data: {
        filePath: path.join(tempDir, 'assets', 'replacement.png'),
        prompt: 'provider replacement prompt',
      },
    });

    await expect(regeneration).resolves.toMatchObject({
      prompt: 'replacement prompt',
      url: '/api/assets/images/replacement.png',
      status: 'completed',
    });
    await expect(statusUpdate).resolves.toBe(true);

    const savedWorkflow = await storage.getWorkflow('workflow-1');
    const savedPost = savedWorkflow?.posts[0];
    expect(savedPost?.status).toBe('approved');
    expect(savedPost?.approvedAt).toEqual(approvedAt);
    expect(savedPost?.images[0]).toMatchObject({
      prompt: 'replacement prompt',
      url: '/api/assets/images/replacement.png',
      status: 'completed',
    });
  });

  it('does not let duplicate stage approvals advance multiple stages', async () => {
    const workflow = createWorkflow({
      currentStage: 'strategy',
      status: 'awaiting-approval',
      awaitingApproval: true,
      strategy: {
        weekNumber: 1,
        year: 2026,
        theme: 'Test theme',
        goals: ['Create content'],
        posts: [],
      },
      posts: [],
      metrics: {
        totalPosts: 0,
        postsCompleted: 0,
        imagesGenerated: 0,
        videosGenerated: 0,
      },
    });
    await storage.saveWorkflow(workflow);

    const testOrchestrator = orchestrator as unknown as {
      executeCopywritingStage: ReturnType<typeof vi.fn>;
    };
    testOrchestrator.executeCopywritingStage = vi.fn().mockResolvedValue(undefined);

    const approvals = await Promise.allSettled([
      orchestrator.approveStageAndContinue('workflow-1', {
        expectedStage: 'strategy',
        skipImageGeneration: true,
      }),
      orchestrator.approveStageAndContinue('workflow-1', {
        expectedStage: 'strategy',
        skipImageGeneration: true,
      }),
    ]);

    expect(approvals.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(approvals.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const savedWorkflow = await storage.getWorkflow('workflow-1');
    expect(savedWorkflow?.currentStage).toBe('copywriting');
    expect(savedWorkflow?.status).toBe('awaiting-approval');
    expect(savedWorkflow?.stageApprovals).toHaveLength(1);
  });

  it('rejects a stale approval retry after the workflow advances to the next gate', async () => {
    const workflow = createWorkflow({
      currentStage: 'strategy',
      status: 'awaiting-approval',
      awaitingApproval: true,
      strategy: {
        weekNumber: 1,
        year: 2026,
        theme: 'Test theme',
        goals: ['Create content'],
        posts: [],
      },
      posts: [],
      metrics: {
        totalPosts: 0,
        postsCompleted: 0,
        imagesGenerated: 0,
        videosGenerated: 0,
      },
    });
    await storage.saveWorkflow(workflow);

    const testOrchestrator = orchestrator as unknown as {
      executeCopywritingStage: ReturnType<typeof vi.fn>;
    };
    testOrchestrator.executeCopywritingStage = vi.fn().mockResolvedValue(undefined);

    await orchestrator.approveStageAndContinue('workflow-1', {
      expectedStage: 'strategy',
      skipImageGeneration: true,
    });

    await expect(
      orchestrator.approveStageAndContinue('workflow-1', {
        expectedStage: 'strategy',
        skipImageGeneration: true,
      })
    ).rejects.toThrow('Workflow is awaiting approval for copywriting, not strategy');

    const savedWorkflow = await storage.getWorkflow('workflow-1');
    expect(savedWorkflow?.currentStage).toBe('copywriting');
    expect(savedWorkflow?.status).toBe('awaiting-approval');
    expect(savedWorkflow?.stageApprovals.map((approval) => approval.stage)).toEqual(['strategy']);
  });
});
