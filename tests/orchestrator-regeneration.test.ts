import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { WeeklyWorkflowOrchestrator } from '../src/agents/WeeklyWorkflowOrchestrator.js';
import { ContentStorage } from '../src/storage/ContentStorage.js';
import type { WeeklyWorkflow } from '../src/types/index.js';

describe('WeeklyWorkflowOrchestrator asset regeneration', () => {
  let tempDir: string;
  let storage: ContentStorage;
  let orchestrator: WeeklyWorkflowOrchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-regeneration-'));
    storage = new ContentStorage(tempDir);
    await storage.getAllWorkflows();
    orchestrator = Object.create(WeeklyWorkflowOrchestrator.prototype) as WeeklyWorkflowOrchestrator;

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

    const result = await orchestrator.regenerateAsset('workflow-1', {
      assetId: 'asset-1',
      postId: 'post-1',
      newPrompt: 'replacement prompt',
      type: 'image',
    });

    expect(result).toMatchObject({
      prompt: 'original prompt',
      url: '/api/assets/images/original.png',
      filePath: '/tmp/original.png',
      status: 'completed',
      metadata: { source: 'original' },
    });
    expect(result?.generatedAt).toEqual(originalGeneratedAt);

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
});
