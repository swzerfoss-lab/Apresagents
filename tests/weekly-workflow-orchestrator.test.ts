import { describe, expect, it, vi } from 'vitest';
import { WeeklyWorkflowOrchestrator } from '../src/agents/WeeklyWorkflowOrchestrator.js';
import { BrandConfig, WeeklyWorkflow, WorkflowStage } from '../src/types/index.js';

const brandConfig: BrandConfig = {
  name: 'Test Brand',
  description: 'A test brand',
  tone: ['friendly'],
  targetAudience: 'Test audience',
  keywords: ['test'],
};

function createWorkflow(currentStage: WorkflowStage): WeeklyWorkflow {
  const now = new Date('2026-04-30T00:00:00.000Z');

  return {
    id: 'workflow-1',
    weekStartDate: now,
    weekEndDate: now,
    status: 'awaiting-approval',
    currentStage,
    createdAt: now,
    posts: [],
    errors: [],
    metrics: {
      totalPosts: 0,
      postsCompleted: 0,
      imagesGenerated: 0,
      videosGenerated: 0,
      startTime: now,
    },
    stageApprovals: [],
    awaitingApproval: true,
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

function createOrchestratorWithWorkflow(workflow: WeeklyWorkflow): WeeklyWorkflowOrchestrator {
  const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
  const storage = {
    getWorkflow: vi.fn(),
    saveWorkflow: vi.fn().mockResolvedValue(undefined),
  };

  Object.assign(orchestrator as unknown as { currentWorkflow: WeeklyWorkflow; storage: typeof storage }, {
    currentWorkflow: workflow,
    storage,
  });

  return orchestrator;
}

describe('WeeklyWorkflowOrchestrator approvals', () => {
  it('skips image generation without recursively approving the video stage', async () => {
    const orchestrator = createOrchestratorWithWorkflow(createWorkflow('copywriting'));

    const workflow = await orchestrator.approveStageAndContinue('workflow-1', {
      expectedStage: 'copywriting',
      skipImageGeneration: true,
    });

    expect(workflow.status).toBe('awaiting-approval');
    expect(workflow.currentStage).toBe('video-generation');
    expect(workflow.awaitingApproval).toBe(true);
    expect(workflow.errors).toEqual([]);
    expect(workflow.stageApprovals.map((approval) => approval.stage)).toEqual(['copywriting']);
  });

  it('skips image and video generation without recursively approving assembly', async () => {
    const orchestrator = createOrchestratorWithWorkflow(createWorkflow('copywriting'));

    const workflow = await orchestrator.approveStageAndContinue('workflow-1', {
      expectedStage: 'copywriting',
      skipImageGeneration: true,
      skipVideoGeneration: true,
    });

    expect(workflow.status).toBe('awaiting-approval');
    expect(workflow.currentStage).toBe('assembly');
    expect(workflow.awaitingApproval).toBe(true);
    expect(workflow.errors).toEqual([]);
    expect(workflow.stageApprovals.map((approval) => approval.stage)).toEqual(['copywriting']);
  });

  it('skips video generation after image approval without recursively approving assembly', async () => {
    const orchestrator = createOrchestratorWithWorkflow(createWorkflow('image-generation'));

    const workflow = await orchestrator.approveStageAndContinue('workflow-1', {
      expectedStage: 'image-generation',
      skipVideoGeneration: true,
    });

    expect(workflow.status).toBe('awaiting-approval');
    expect(workflow.currentStage).toBe('assembly');
    expect(workflow.awaitingApproval).toBe(true);
    expect(workflow.errors).toEqual([]);
    expect(workflow.stageApprovals.map((approval) => approval.stage)).toEqual(['image-generation']);
  });

  it('serializes overlapping workflow starts on a shared orchestrator instance', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    const firstStageGate = createDeferred<void>();
    const firstStageStarted = createDeferred<void>();
    const startedWorkflowIds: string[] = [];
    let strategyCallCount = 0;

    const testOrchestrator = orchestrator as unknown as {
      currentWorkflow: WeeklyWorkflow | null;
      executeStrategyStage: ReturnType<typeof vi.fn>;
      storage: {
        saveWorkflow: ReturnType<typeof vi.fn>;
      };
    };
    testOrchestrator.storage = {
      saveWorkflow: vi.fn().mockResolvedValue(undefined),
    };
    testOrchestrator.executeStrategyStage = vi.fn(async () => {
      strategyCallCount += 1;
      startedWorkflowIds.push(testOrchestrator.currentWorkflow?.id || '');
      if (strategyCallCount === 1) {
        firstStageStarted.resolve();
        await firstStageGate.promise;
      }
    });

    const firstRun = orchestrator.executeWeeklyWorkflow(new Date('2026-05-04T00:00:00.000Z'));
    await firstStageStarted.promise;
    expect(testOrchestrator.executeStrategyStage).toHaveBeenCalledTimes(1);

    const secondRun = orchestrator.executeWeeklyWorkflow(new Date('2026-05-11T00:00:00.000Z'));
    await Promise.resolve();
    await Promise.resolve();
    expect(testOrchestrator.executeStrategyStage).toHaveBeenCalledTimes(1);

    firstStageGate.resolve();
    await firstRun;
    await secondRun;

    expect(testOrchestrator.executeStrategyStage).toHaveBeenCalledTimes(2);
    expect(new Set(startedWorkflowIds).size).toBe(2);

    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  it('serializes overlapping approvals for different workflows on a shared orchestrator instance', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    const firstStageGate = createDeferred<void>();
    const firstStageStarted = createDeferred<void>();
    const workflows = new Map<string, WeeklyWorkflow>([
      ['workflow-1', { ...createWorkflow('strategy'), id: 'workflow-1' }],
      ['workflow-2', { ...createWorkflow('strategy'), id: 'workflow-2' }],
    ]);
    const copywritingWorkflowIds: string[] = [];
    let copywritingCallCount = 0;

    const testOrchestrator = orchestrator as unknown as {
      currentWorkflow: WeeklyWorkflow | null;
      executeCopywritingStage: ReturnType<typeof vi.fn>;
      storage: {
        getWorkflow: ReturnType<typeof vi.fn>;
        saveWorkflow: ReturnType<typeof vi.fn>;
      };
    };
    testOrchestrator.currentWorkflow = null;
    testOrchestrator.storage = {
      getWorkflow: vi.fn(async (id: string) => workflows.get(id) || null),
      saveWorkflow: vi.fn(async (workflow: WeeklyWorkflow) => {
        workflows.set(workflow.id, workflow);
      }),
    };
    testOrchestrator.executeCopywritingStage = vi.fn(async () => {
      copywritingCallCount += 1;
      copywritingWorkflowIds.push(testOrchestrator.currentWorkflow?.id || '');
      if (copywritingCallCount === 1) {
        firstStageStarted.resolve();
        await firstStageGate.promise;
      }
    });

    const firstApproval = orchestrator.approveStageAndContinue('workflow-1', {
      expectedStage: 'strategy',
    });
    await firstStageStarted.promise;
    expect(testOrchestrator.executeCopywritingStage).toHaveBeenCalledTimes(1);

    const secondApproval = orchestrator.approveStageAndContinue('workflow-2', {
      expectedStage: 'strategy',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(testOrchestrator.executeCopywritingStage).toHaveBeenCalledTimes(1);

    firstStageGate.resolve();
    const [firstWorkflow, secondWorkflow] = await Promise.all([firstApproval, secondApproval]);

    expect(copywritingWorkflowIds).toEqual(['workflow-1', 'workflow-2']);
    expect(firstWorkflow.id).toBe('workflow-1');
    expect(secondWorkflow.id).toBe('workflow-2');
    expect(firstWorkflow.currentStage).toBe('copywriting');
    expect(secondWorkflow.currentStage).toBe('copywriting');

    consoleLog.mockRestore();
    consoleError.mockRestore();
  });
});

describe('WeeklyWorkflowOrchestrator calendar edits after copywriting recovery', () => {
  function createRecoveredStrategyWorkflow(): WeeklyWorkflow {
    const now = new Date('2026-05-04T00:00:00.000Z');
    return {
      id: 'workflow-recovered',
      weekStartDate: now,
      weekEndDate: now,
      status: 'awaiting-approval',
      currentStage: 'strategy',
      createdAt: now,
      strategy: {
        weekNumber: 19,
        year: 2026,
        theme: 'Recovery',
        goals: ['engagement'],
        posts: [
          {
            id: 'post-1',
            platform: 'instagram',
            contentType: 'post',
            category: 'promotional',
            topic: 'Old serum topic',
            briefDescription: 'Old brief',
            scheduledDate: now,
            scheduledTime: '09:00',
            priority: 'high',
          },
          {
            id: 'post-2',
            platform: 'tiktok',
            contentType: 'reel',
            category: 'educational',
            topic: 'Routine',
            briefDescription: 'Morning routine',
            scheduledDate: now,
            scheduledTime: '12:00',
            priority: 'medium',
          },
        ],
      },
      posts: [
        {
          id: 'post-1',
          workflowId: 'workflow-recovered',
          platform: 'instagram',
          contentType: 'post',
          category: 'promotional',
          scheduledDate: now,
          scheduledTime: '09:00',
          status: 'draft',
          caption: 'Stale caption about old serum topic',
          hashtags: ['#old'],
          callToAction: 'Shop',
          images: [
            {
              id: 'asset-1',
              postId: 'post-1',
              type: 'image',
              prompt: 'stale prompt',
              status: 'pending',
            },
          ],
          videos: [],
          platformFormatting: {
            platform: 'instagram',
            formattedCaption: 'Stale caption about old serum topic',
            formattedHashtags: '#old',
            characterCount: 34,
            hashtagCount: 1,
            aspectRatio: '1:1',
            additionalNotes: [],
            isWithinLimits: true,
          },
          createdAt: now,
        },
      ],
      errors: [],
      metrics: {
        totalPosts: 2,
        postsCompleted: 1,
        imagesGenerated: 0,
        videosGenerated: 0,
      },
      stageApprovals: [],
      awaitingApproval: true,
    };
  }

  it('invalidates preserved ReadyPosts when calendar content changes', async () => {
    const workflow = createRecoveredStrategyWorkflow();
    const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    const testOrchestrator = orchestrator as unknown as {
      storage: {
        getWorkflow: ReturnType<typeof vi.fn>;
        saveWorkflow: ReturnType<typeof vi.fn>;
      };
    };
    testOrchestrator.storage = {
      getWorkflow: vi.fn(async () => workflow),
      saveWorkflow: vi.fn(async (saved: WeeklyWorkflow) => {
        Object.assign(workflow, saved);
      }),
    };

    const planned = await orchestrator.editCalendarEntry(workflow.id, {
      postId: 'post-1',
      topic: 'New recovery serum angle',
      briefDescription: 'Updated brief for paid regen',
    });

    expect(planned?.topic).toBe('New recovery serum angle');
    expect(workflow.posts.map((post) => post.id)).toEqual([]);
    expect(workflow.metrics.postsCompleted).toBe(0);
    expect(testOrchestrator.storage.saveWorkflow).toHaveBeenCalled();
  });

  it('syncs schedule-only calendar edits onto preserved ReadyPosts', async () => {
    const workflow = createRecoveredStrategyWorkflow();
    const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    const testOrchestrator = orchestrator as unknown as {
      storage: {
        getWorkflow: ReturnType<typeof vi.fn>;
        saveWorkflow: ReturnType<typeof vi.fn>;
      };
    };
    testOrchestrator.storage = {
      getWorkflow: vi.fn(async () => workflow),
      saveWorkflow: vi.fn(async (saved: WeeklyWorkflow) => {
        Object.assign(workflow, saved);
      }),
    };

    await orchestrator.editCalendarEntry(workflow.id, {
      postId: 'post-1',
      scheduledTime: '15:30',
    });

    expect(workflow.posts).toHaveLength(1);
    expect(workflow.posts[0]).toMatchObject({
      id: 'post-1',
      scheduledTime: '15:30',
      caption: 'Stale caption about old serum topic',
    });
    expect(workflow.strategy?.posts[0].scheduledTime).toBe('15:30');
    expect(workflow.metrics.postsCompleted).toBe(1);
  });

  it('regenerates copy when re-approving strategy after a content calendar edit', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const workflow = createRecoveredStrategyWorkflow();
    const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    const testOrchestrator = orchestrator as unknown as {
      storage: {
        getWorkflow: ReturnType<typeof vi.fn>;
        saveWorkflow: ReturnType<typeof vi.fn>;
      };
      copywritingAgent: {
        generateCaption: ReturnType<typeof vi.fn>;
        generateHashtags: ReturnType<typeof vi.fn>;
      };
      visualAgent: {
        generateImagePrompt: ReturnType<typeof vi.fn>;
      };
      videoAgent: {
        generateVideoConcept: ReturnType<typeof vi.fn>;
      };
      getDefaultPlatformFormatting: ReturnType<typeof vi.fn>;
      shouldGenerateVideo: ReturnType<typeof vi.fn>;
    };

    testOrchestrator.storage = {
      getWorkflow: vi.fn(async () => workflow),
      saveWorkflow: vi.fn(async (saved: WeeklyWorkflow) => {
        Object.assign(workflow, saved);
      }),
    };
    testOrchestrator.copywritingAgent = {
      generateCaption: vi.fn().mockResolvedValue({
        success: true,
        data: {
          caption: 'Fresh caption for new recovery serum angle',
          hashtags: ['#new'],
          callToAction: 'Shop now',
        },
      }),
      generateHashtags: vi.fn().mockResolvedValue({
        success: true,
        data: { primary: ['#new'], secondary: [], branded: [] },
      }),
    };
    testOrchestrator.visualAgent = {
      generateImagePrompt: vi.fn().mockResolvedValue({
        success: true,
        data: { prompt: 'fresh image prompt' },
      }),
    };
    testOrchestrator.videoAgent = {
      generateVideoConcept: vi.fn().mockResolvedValue({ success: false }),
    };
    testOrchestrator.getDefaultPlatformFormatting = vi.fn().mockResolvedValue({
      platform: 'instagram',
      formattedCaption: 'Fresh caption for new recovery serum angle',
      formattedHashtags: '#new',
      characterCount: 42,
      hashtagCount: 1,
      aspectRatio: '1:1',
      additionalNotes: [],
      isWithinLimits: true,
    });
    testOrchestrator.shouldGenerateVideo = vi.fn().mockReturnValue(false);

    await orchestrator.editCalendarEntry(workflow.id, {
      postId: 'post-1',
      topic: 'New recovery serum angle',
    });

    // post-2 still missing; mock second caption generation too
    testOrchestrator.copywritingAgent.generateCaption = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          caption: 'Fresh caption for new recovery serum angle',
          hashtags: ['#new'],
          callToAction: 'Shop now',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          caption: 'Routine caption',
          hashtags: ['#routine'],
          callToAction: 'Try it',
        },
      });

    const approved = await orchestrator.approveStageAndContinue(workflow.id, {
      expectedStage: 'strategy',
    });

    const regenerated = approved.posts.find((post) => post.id === 'post-1');
    expect(regenerated?.caption).toBe('Fresh caption for new recovery serum angle');
    expect(regenerated?.images[0]?.prompt).toBe('fresh image prompt');
    expect(approved.posts.map((post) => post.id).sort()).toEqual(['post-1', 'post-2']);

    consoleLog.mockRestore();
  });
});
