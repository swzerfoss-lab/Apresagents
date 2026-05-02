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
      skipVideoGeneration: true,
    });

    expect(workflow.status).toBe('awaiting-approval');
    expect(workflow.currentStage).toBe('assembly');
    expect(workflow.awaitingApproval).toBe(true);
    expect(workflow.errors).toEqual([]);
    expect(workflow.stageApprovals.map((approval) => approval.stage)).toEqual(['image-generation']);
  });
});
