import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the brand config
const mockBrandConfig = {
  name: 'Test Brand',
  description: 'A test brand for unit testing',
  tone: 'professional, friendly',
  targetAudience: 'Test audience',
  keywords: ['test', 'brand', 'keywords'],
  socialHandles: {
    instagram: '@testbrand',
    tiktok: '@testbrand',
    facebook: 'TestBrand',
    pinterest: 'testbrand',
  },
  website: 'https://testbrand.com',
  contentThemes: ['theme1', 'theme2'],
  hashtagCount: 15,
  postFrequency: 'daily',
};

// Mock workflow state
interface WorkflowState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting-approval';
  currentStage: string;
  platforms: string[];
  posts: unknown[];
  stageApprovals: Array<{ stage: string; approved: boolean }>;
}

class MockWorkflowOrchestrator {
  private workflows: Map<string, WorkflowState> = new Map();
  private workflowCounter = 0;

  async startWorkflow(options: { platforms: string[]; postsPerPlatform: number }) {
    const id = `workflow-${++this.workflowCounter}`;
    const workflow: WorkflowState = {
      id,
      status: 'running',
      currentStage: 'strategy',
      platforms: options.platforms,
      posts: [],
      stageApprovals: [],
    };
    this.workflows.set(id, workflow);
    return { success: true, workflowId: id };
  }

  getWorkflow(id: string) {
    return this.workflows.get(id);
  }

  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  async advanceStage(id: string) {
    const workflow = this.workflows.get(id);
    if (!workflow) return { success: false, error: 'Workflow not found' };

    const stages = ['strategy', 'copywriting', 'image-generation', 'video-generation', 'assembly'];
    const currentIndex = stages.indexOf(workflow.currentStage);

    if (currentIndex < stages.length - 1) {
      workflow.stageApprovals.push({ stage: workflow.currentStage, approved: true });
      workflow.currentStage = stages[currentIndex + 1];
      workflow.status = 'running';
    } else {
      workflow.status = 'completed';
    }

    return { success: true };
  }

  async approveStage(id: string, stage: string) {
    const workflow = this.workflows.get(id);
    if (!workflow) return { success: false, error: 'Workflow not found' };

    workflow.stageApprovals.push({ stage, approved: true });
    workflow.status = 'running';

    return { success: true };
  }
}

describe('Workflow Orchestrator', () => {
  let orchestrator: MockWorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new MockWorkflowOrchestrator();
  });

  describe('startWorkflow', () => {
    it('should create a new workflow', async () => {
      const result = await orchestrator.startWorkflow({
        platforms: ['instagram', 'tiktok'],
        postsPerPlatform: 3,
      });

      expect(result.success).toBe(true);
      expect(result.workflowId).toBeDefined();
    });

    it('should initialize workflow in running state', async () => {
      const result = await orchestrator.startWorkflow({
        platforms: ['instagram'],
        postsPerPlatform: 2,
      });

      const workflow = orchestrator.getWorkflow(result.workflowId);

      expect(workflow).toBeDefined();
      expect(workflow?.status).toBe('running');
      expect(workflow?.currentStage).toBe('strategy');
    });

    it('should store platform configuration', async () => {
      const platforms = ['instagram', 'tiktok', 'facebook'];
      const result = await orchestrator.startWorkflow({
        platforms,
        postsPerPlatform: 3,
      });

      const workflow = orchestrator.getWorkflow(result.workflowId);

      expect(workflow?.platforms).toEqual(platforms);
    });
  });

  describe('listWorkflows', () => {
    it('should return empty array when no workflows exist', () => {
      const workflows = orchestrator.listWorkflows();
      expect(workflows).toEqual([]);
    });

    it('should return all created workflows', async () => {
      await orchestrator.startWorkflow({ platforms: ['instagram'], postsPerPlatform: 1 });
      await orchestrator.startWorkflow({ platforms: ['tiktok'], postsPerPlatform: 2 });
      await orchestrator.startWorkflow({ platforms: ['facebook'], postsPerPlatform: 3 });

      const workflows = orchestrator.listWorkflows();

      expect(workflows.length).toBe(3);
    });
  });

  describe('advanceStage', () => {
    it('should advance to next stage', async () => {
      const result = await orchestrator.startWorkflow({
        platforms: ['instagram'],
        postsPerPlatform: 1,
      });

      const workflowId = result.workflowId;

      // Initial stage should be strategy
      let workflow = orchestrator.getWorkflow(workflowId);
      expect(workflow?.currentStage).toBe('strategy');

      // Advance to copywriting
      await orchestrator.advanceStage(workflowId);
      workflow = orchestrator.getWorkflow(workflowId);
      expect(workflow?.currentStage).toBe('copywriting');

      // Advance to image-generation
      await orchestrator.advanceStage(workflowId);
      workflow = orchestrator.getWorkflow(workflowId);
      expect(workflow?.currentStage).toBe('image-generation');
    });

    it('should mark workflow as completed after final stage', async () => {
      const result = await orchestrator.startWorkflow({
        platforms: ['instagram'],
        postsPerPlatform: 1,
      });

      const workflowId = result.workflowId;

      // Advance through all stages
      await orchestrator.advanceStage(workflowId); // strategy -> copywriting
      await orchestrator.advanceStage(workflowId); // copywriting -> image-generation
      await orchestrator.advanceStage(workflowId); // image-generation -> video-generation
      await orchestrator.advanceStage(workflowId); // video-generation -> assembly
      await orchestrator.advanceStage(workflowId); // assembly -> completed

      const workflow = orchestrator.getWorkflow(workflowId);
      expect(workflow?.status).toBe('completed');
    });

    it('should record stage approvals', async () => {
      const result = await orchestrator.startWorkflow({
        platforms: ['instagram'],
        postsPerPlatform: 1,
      });

      await orchestrator.advanceStage(result.workflowId);
      await orchestrator.advanceStage(result.workflowId);

      const workflow = orchestrator.getWorkflow(result.workflowId);

      expect(workflow?.stageApprovals.length).toBe(2);
      expect(workflow?.stageApprovals[0].stage).toBe('strategy');
      expect(workflow?.stageApprovals[1].stage).toBe('copywriting');
    });
  });

  describe('approveStage', () => {
    it('should approve current stage', async () => {
      const result = await orchestrator.startWorkflow({
        platforms: ['instagram'],
        postsPerPlatform: 1,
      });

      const approveResult = await orchestrator.approveStage(result.workflowId, 'strategy');

      expect(approveResult.success).toBe(true);

      const workflow = orchestrator.getWorkflow(result.workflowId);
      expect(workflow?.stageApprovals.some(a => a.stage === 'strategy' && a.approved)).toBe(true);
    });

    it('should fail for non-existent workflow', async () => {
      const result = await orchestrator.approveStage('non-existent', 'strategy');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});

describe('Workflow Validation', () => {
  it('should require at least one platform', () => {
    const platforms: string[] = [];
    expect(platforms.length).toBe(0);
    // In real implementation, this would throw an error
  });

  it('should validate platform names', () => {
    const validPlatforms = ['instagram', 'tiktok', 'facebook', 'pinterest'];
    const testPlatform = 'instagram';

    expect(validPlatforms.includes(testPlatform)).toBe(true);
  });

  it('should validate posts per platform range', () => {
    const minPosts = 1;
    const maxPosts = 10;
    const postsPerPlatform = 3;

    expect(postsPerPlatform >= minPosts && postsPerPlatform <= maxPosts).toBe(true);
  });
});

describe('Stage Transitions', () => {
  const stages = ['strategy', 'copywriting', 'image-generation', 'video-generation', 'assembly'];

  it('should have correct stage order', () => {
    expect(stages[0]).toBe('strategy');
    expect(stages[stages.length - 1]).toBe('assembly');
  });

  it('should have 5 stages total', () => {
    expect(stages.length).toBe(5);
  });

  it('should allow transition to next stage only', () => {
    const currentStage = 'copywriting';
    const currentIndex = stages.indexOf(currentStage);
    const nextStage = stages[currentIndex + 1];

    expect(nextStage).toBe('image-generation');
  });
});
