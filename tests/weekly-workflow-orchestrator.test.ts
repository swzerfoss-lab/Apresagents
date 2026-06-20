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
    const orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    const firstStageGate = createDeferred<void>();
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
        await firstStageGate.promise;
      }
    });

    const firstRun = orchestrator.executeWeeklyWorkflow(new Date('2026-05-04T00:00:00.000Z'));
    await Promise.resolve();
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
  });
});
