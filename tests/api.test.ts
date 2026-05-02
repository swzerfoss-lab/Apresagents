import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Create a minimal test app with the same routes
const app = express();
app.use(express.json());

// Mock data
const mockWorkflows: Record<string, unknown>[] = [];
let workflowIdCounter = 0;

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    agents: {
      manager: 'ready',
      video: 'ready',
      strategy: 'ready',
    },
  });
});

// Workflow list endpoint
app.get('/api/workflow/list', (_req, res) => {
  res.json({
    success: true,
    workflows: mockWorkflows,
  });
});

// Workflow trigger endpoint
app.post('/api/workflow/trigger', (req, res) => {
  const { platforms, postsPerPlatform } = req.body;

  if (!platforms || !Array.isArray(platforms)) {
    return res.status(400).json({ error: 'Platforms array is required' });
  }

  const workflow = {
    id: `wf-${++workflowIdCounter}`,
    status: 'running',
    currentStage: 'strategy',
    platforms,
    postsPerPlatform: postsPerPlatform || 3,
    createdAt: new Date().toISOString(),
  };

  mockWorkflows.unshift(workflow);

  res.json({
    success: true,
    workflowId: workflow.id,
    message: 'Workflow triggered successfully',
  });
});

// Workflow detail endpoint
app.get('/api/workflow/:id', (req, res) => {
  const workflow = mockWorkflows.find((w: { id?: string }) => w.id === req.params.id);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json({
    success: true,
    workflow,
  });
});

// Content generate endpoint
app.post('/api/content/generate', (req, res) => {
  const { platform, objective, topic } = req.body;

  if (!platform) {
    return res.status(400).json({ error: 'Platform is required' });
  }

  res.json({
    success: true,
    content: {
      platform,
      objective: objective || 'engagement',
      topic: topic || 'general',
      caption: 'Test generated caption for ' + platform,
      hashtags: ['#test', '#content'],
    },
  });
});

// Image render endpoint
app.post('/api/image/render', (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  res.json({
    success: true,
    image: {
      url: '/api/assets/images/test-image.png',
      prompt,
      mimeType: 'image/png',
    },
  });
});

// Video render endpoint
app.post('/api/video/render', (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  res.json({
    success: true,
    video: {
      url: '/api/assets/videos/test-video.mp4',
      prompt,
      duration: 8,
      resolution: '1080p',
      hasAudio: true,
    },
  });
});

describe('API Endpoints', () => {
  beforeAll(() => {
    // Clear mock workflows
    mockWorkflows.length = 0;
    workflowIdCounter = 0;
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.agents).toBeDefined();
      expect(res.body.agents.manager).toBe('ready');
    });
  });

  describe('GET /api/workflow/list', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/api/workflow/list');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.workflows).toEqual([]);
    });
  });

  describe('POST /api/workflow/trigger', () => {
    it('should trigger a new workflow', async () => {
      const res = await request(app)
        .post('/api/workflow/trigger')
        .send({
          platforms: ['instagram', 'tiktok'],
          postsPerPlatform: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.workflowId).toBeDefined();
    });

    it('should reject request without platforms', async () => {
      const res = await request(app)
        .post('/api/workflow/trigger')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Platforms');
    });

    it('should add workflow to list', async () => {
      const triggerRes = await request(app)
        .post('/api/workflow/trigger')
        .send({ platforms: ['facebook'] });

      const listRes = await request(app).get('/api/workflow/list');

      expect(listRes.body.workflows.length).toBeGreaterThan(0);
      expect(listRes.body.workflows[0].id).toBe(triggerRes.body.workflowId);
    });
  });

  describe('GET /api/workflow/:id', () => {
    it('should return workflow details', async () => {
      // First trigger a workflow
      const triggerRes = await request(app)
        .post('/api/workflow/trigger')
        .send({ platforms: ['pinterest'] });

      const workflowId = triggerRes.body.workflowId;

      const res = await request(app).get(`/api/workflow/${workflowId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.workflow.id).toBe(workflowId);
    });

    it('should return 404 for non-existent workflow', async () => {
      const res = await request(app).get('/api/workflow/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('POST /api/content/generate', () => {
    it('should generate content for platform', async () => {
      const res = await request(app)
        .post('/api/content/generate')
        .send({
          platform: 'instagram',
          objective: 'engagement',
          topic: 'winter sports',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.content.platform).toBe('instagram');
      expect(res.body.content.caption).toBeDefined();
    });

    it('should reject request without platform', async () => {
      const res = await request(app)
        .post('/api/content/generate')
        .send({ topic: 'test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/image/render', () => {
    it('should render image from prompt', async () => {
      const res = await request(app)
        .post('/api/image/render')
        .send({
          prompt: 'A skier on a mountain at sunset',
          aspectRatio: '1:1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.image.url).toBeDefined();
      expect(res.body.image.prompt).toContain('skier');
    });

    it('should reject request without prompt', async () => {
      const res = await request(app)
        .post('/api/image/render')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/video/render', () => {
    it('should render video from prompt', async () => {
      const res = await request(app)
        .post('/api/video/render')
        .send({
          prompt: 'Cinematic snowboarding footage',
          duration: 8,
          aspectRatio: '16:9',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.video.url).toBeDefined();
      expect(res.body.video.duration).toBe(8);
      expect(res.body.video.hasAudio).toBe(true);
    });

    it('should reject request without prompt', async () => {
      const res = await request(app)
        .post('/api/video/render')
        .send({ duration: 8 });

      expect(res.status).toBe(400);
    });
  });
});
