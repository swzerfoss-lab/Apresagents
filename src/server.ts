import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import {
  SocialMediaManagerAgent,
  VideoContentAgent,
  VisualContentAgent,
  ContentStrategyAgent,
  BrandVoiceAgent,
  WeeklyWorkflowOrchestrator,
  WorkflowMutationConflictError,
} from './agents/index.js';
import { WorkflowScheduler } from './services/WorkflowScheduler.js';
import { ContentStorage } from './storage/ContentStorage.js';
import { getBrandConfig, sampleProducts, validateConfig } from './config/index.js';
import type { SocialPlatform, CampaignObjective, WorkflowStage } from './types/index.js';
import { generalLimiter, generationLimiter, workflowLimiter } from './middleware/rateLimit.js';
import { requireAdminAuth } from './middleware/auth.js';
import {
  validate,
  WorkflowTriggerSchema,
  ContentGenerateSchema,
  ImageRenderSchema,
  PostStatusSchema,
} from './middleware/validation.js';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

// Validate configuration
const configCheck = validateConfig();
if (!configCheck.valid) {
  console.warn(`Warning: Missing environment variables: ${configCheck.missing.join(', ')}`);
  console.log('Some features may not be available. Please check your .env file.');
}

// Initialize agents
const brandConfig = getBrandConfig();
const manager = new SocialMediaManagerAgent(brandConfig);
const videoAgent = new VideoContentAgent(brandConfig);
const imageAgent = new VisualContentAgent(brandConfig);
const strategyAgent = new ContentStrategyAgent(brandConfig);
const brandVoiceAgent = new BrandVoiceAgent(brandConfig);

// Initialize workflow system
const workflowOrchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
const workflowScheduler = new WorkflowScheduler(brandConfig, {
  enabled: true,
  dayOfWeek: 0, // Sunday
  hour: 20, // 8pm
  minute: 0,
  timezone: 'America/New_York',
});
const contentStorage = new ContentStorage();

// Create Express app
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

function sendWorkflowMutationError(
  error: unknown,
  res: express.Response,
  fallbackMessage: string
): void {
  if (error instanceof WorkflowMutationConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: fallbackMessage });
}

const workflowStages = new Set<WorkflowStage>([
  'strategy',
  'copywriting',
  'image-generation',
  'video-generation',
  'assembly',
]);

function isWorkflowStage(value: unknown): value is WorkflowStage {
  return typeof value === 'string' && workflowStages.has(value as WorkflowStage);
}

async function recoverInterruptedWorkflowState(): Promise<void> {
  try {
    const recovered = await contentStorage.recoverInterruptedWorkflows();
    if (recovered.length > 0) {
      console.warn(
        `Recovered ${recovered.length} workflow(s) interrupted during a previous process run`
      );
    }
  } catch (error) {
    console.error('Failed to recover interrupted workflows:', error);
  }
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', generalLimiter);

// Health check with deep checks
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, { status: 'ok' | 'error' | 'degraded'; message?: string }> = {};

  // Check scheduler
  const schedulerStatus = workflowScheduler.getStatus();
  checks.scheduler = { status: 'ok' };

  // Check video generation API availability
  checks.videoApi = videoAgent.isVideoGenerationAvailable()
    ? { status: 'ok' }
    : { status: 'degraded', message: 'GOOGLE_API_KEY not configured' };

  // Check image generation (uses same API as video)
  checks.imageApi = imageAgent.isImageGenerationAvailable()
    ? { status: 'ok' }
    : { status: 'degraded', message: 'GOOGLE_API_KEY not configured' };

  // Check content generation (Claude)
  checks.contentApi = process.env.ANTHROPIC_API_KEY
    ? { status: 'ok' }
    : { status: 'degraded', message: 'ANTHROPIC_API_KEY not configured' };

  // Check storage accessibility
  try {
    await contentStorage.getStorageStats();
    checks.storage = { status: 'ok' };
  } catch (error) {
    checks.storage = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Storage unavailable',
    };
  }

  // Determine overall status
  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded');
  const overallStatus = hasError ? 'error' : hasDegraded ? 'degraded' : 'ok';

  res.status(hasError ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    scheduler: {
      isRunning: schedulerStatus.isRunning,
      nextScheduledRun: schedulerStatus.nextScheduledRun,
    },
  });
});

// Get brand info
app.get('/api/brand', (_req, res) => {
  res.json({
    brand: brandConfig,
    products: sampleProducts,
  });
});

// Get products
app.get('/api/products', (_req, res) => {
  res.json({ products: sampleProducts });
});

// All remaining app and API routes can mutate workflows or spend model quota.
app.use(requireAdminAuth);

// Serve generated assets after auth; they can contain unpublished campaign content.
const assetsDir = path.join(process.cwd(), 'data', 'assets');
app.use('/api/assets/images', express.static(path.join(assetsDir, 'images')));
app.use('/api/assets/videos', express.static(path.join(assetsDir, 'videos')));

// Serve static frontend files after auth so deployed portals are not public.
const webDistPath = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(webDistPath));

/**
 * Generate content for platforms
 */
app.post('/api/content/generate', generationLimiter, validate(ContentGenerateSchema), async (req, res) => {
  try {
    const { topic, platforms, productId } = req.body;

    const product = productId
      ? sampleProducts.find((p) => p.id === productId)
      : undefined;

    const result = await manager.generateContentPackage(
      topic,
      platforms as SocialPlatform[],
      product
    );

    if (result.success && result.data) {
      res.json({
        success: true,
        content: result.data.content,
        visualPrompts: result.data.visualPrompts,
        brandVoiceCheck: result.data.brandVoiceCheck,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate content' });
    }
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate video concept with Veo 3
 */
app.post('/api/video/generate', async (req, res) => {
  try {
    const { topic, platform, style, duration, productId } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const product = productId
      ? sampleProducts.find((p) => p.id === productId)
      : undefined;

    let result;
    if (product) {
      const videoStyle =
        style === 'cinematic'
          ? 'hero'
          : style === 'lifestyle'
            ? 'lifestyle'
            : 'action-recovery';
      result = await videoAgent.generateProductVideo(
        product,
        videoStyle as 'hero' | 'demo' | 'lifestyle' | 'action-recovery' | 'testimonial',
        platform as SocialPlatform
      );
    } else {
      result = await videoAgent.generateVideoConcept(
        topic,
        platform as SocialPlatform,
        duration || '30s',
        product
      );
    }

    if (result.success && result.data) {
      res.json({
        success: true,
        concept: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate video concept' });
    }
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate actual video with Veo 3 from a prompt
 * Video generation can take several minutes, so we set a long timeout
 */
app.post('/api/video/render', generationLimiter, async (req, res) => {
  // Set a 10-minute timeout for video generation
  req.setTimeout(600000);
  res.setTimeout(600000);

  try {
    const {
      prompt,
      duration,
      aspectRatio,
      style,
      resolution,
      withAudio,
      negativePrompt,
      seed,
      useFastModel,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!videoAgent.isVideoGenerationAvailable()) {
      return res.status(503).json({ error: 'Video generation not available. Check GOOGLE_API_KEY.' });
    }

    console.log(`Generating video with prompt: ${prompt.substring(0, 100)}...`);

    // Create videos directory if needed
    const videosDir = path.join(process.cwd(), 'data', 'assets', 'videos');
    const fs = await import('fs');
    fs.mkdirSync(videosDir, { recursive: true });

    const result = await videoAgent.generateVideo(prompt, {
      duration: duration || 8,
      aspectRatio: aspectRatio || '16:9',
      style: style || 'cinematic',
      resolution: resolution || '1080p',
      withAudio: withAudio !== false, // Audio enabled by default
      negativePrompt,
      seed,
      useFastModel: useFastModel || false,
      outputDirectory: videosDir,
    });

    if (result.success && result.data) {
      // Build URL for the video
      const fileName = result.data.filePath ? path.basename(result.data.filePath) : null;
      const videoUrl = fileName ? `/api/assets/videos/${fileName}` : result.data.videoUrl;

      res.json({
        success: true,
        video: {
          url: videoUrl,
          filePath: result.data.filePath,
          duration: result.data.duration,
          resolution: result.data.resolution,
          hasAudio: result.data.hasAudio,
          prompt: result.data.prompt,
        },
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate video' });
    }
  } catch (error) {
    console.error('Error rendering video:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * Generate actual image with Gemini from a prompt
 */
app.post('/api/image/render', generationLimiter, validate(ImageRenderSchema), async (req, res) => {
  try {
    const { prompt, aspectRatio, style } = req.body;

    console.log(`Generating image with prompt: ${prompt.substring(0, 100)}...`);

    // Create images directory if needed
    const imagesDir = path.join(process.cwd(), 'data', 'assets', 'images');
    const fs = await import('fs');
    fs.mkdirSync(imagesDir, { recursive: true });

    const result = await imageAgent.generateImage(prompt, {
      aspectRatio: aspectRatio || '1:1',
      style: style || 'photorealistic',
      outputDirectory: imagesDir,
    });

    if (result.success && result.data) {
      // Build URL for the image
      const fileName = result.data.filePath ? path.basename(result.data.filePath) : null;
      const imageUrl = fileName ? `/api/assets/images/${fileName}` : null;

      res.json({
        success: true,
        image: {
          url: imageUrl,
          filePath: result.data.filePath,
          mimeType: result.data.mimeType,
          prompt: result.data.prompt,
        },
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate image' });
    }
  } catch (error) {
    console.error('Error rendering image:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * Generate video campaign
 */
app.post('/api/video/campaign', async (req, res) => {
  try {
    const { theme, season, count, platforms } = req.body;

    let result;
    if (season) {
      result = await videoAgent.generateSeasonalVideoCampaign(
        season as 'early-season' | 'peak-season' | 'spring-skiing' | 'off-season'
      );
    } else {
      result = await videoAgent.generateCampaignVideos(
        theme || 'Mountain lifestyle',
        platforms as SocialPlatform[],
        count || 5
      );
    }

    if (result.success && result.data) {
      res.json({
        success: true,
        campaign: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate campaign' });
    }
  } catch (error) {
    console.error('Error generating video campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create ad campaign
 */
app.post('/api/campaign/create', async (req, res) => {
  try {
    const { objective, platforms, budget, productId } = req.body;

    if (!platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Platforms are required' });
    }

    const product = productId
      ? sampleProducts.find((p) => p.id === productId)
      : undefined;

    const result = await manager.createAdCampaign({
      objective: objective as CampaignObjective,
      platforms: platforms as SocialPlatform[],
      budget,
      product,
      targetAudience: {
        ageRange: [28, 55],
        gender: 'all',
        interests: ['skiing', 'snowboarding', 'winter sports', 'skincare', 'wellness'],
      },
    });

    if (result.success && result.data) {
      res.json({
        success: true,
        campaign: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to create campaign' });
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate content calendar
 */
app.post('/api/calendar/generate', async (req, res) => {
  try {
    const { days, platforms, postsPerWeek } = req.body;

    if (!platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Platforms are required' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (days || 7));

    const result = await manager.createDetailedCalendar({
      startDate,
      endDate,
      platforms: platforms as SocialPlatform[],
      postsPerWeek: postsPerWeek || 7,
    });

    if (result.success && result.data) {
      res.json({
        success: true,
        calendar: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate calendar' });
    }
  } catch (error) {
    console.error('Error generating calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate brand guidelines
 */
app.post('/api/brand/guidelines', async (_req, res) => {
  try {
    const result = await manager.generateBrandGuidelines();

    if (result.success && result.data) {
      res.json({
        success: true,
        voiceGuidelines: result.data.voiceGuidelines,
        visualGuidelines: result.data.visualGuidelines,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to generate guidelines' });
    }
  } catch (error) {
    console.error('Error generating guidelines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get content trends analysis
 */
app.post('/api/strategy/trends', async (_req, res) => {
  try {
    const result = await strategyAgent.analyzeTrends();

    if (result.success && result.data) {
      res.json({
        success: true,
        trends: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to analyze trends' });
    }
  } catch (error) {
    console.error('Error analyzing trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get posting schedule recommendations
 */
app.post('/api/strategy/schedule', async (req, res) => {
  try {
    const { platforms } = req.body;

    const result = await strategyAgent.suggestPostingSchedule(
      platforms as SocialPlatform[]
    );

    if (result.success && result.data) {
      res.json({
        success: true,
        schedule: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to get schedule' });
    }
  } catch (error) {
    console.error('Error getting schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check content inclusivity
 */
app.post('/api/brand/check', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await brandVoiceAgent.checkInclusivity(content);

    if (result.success && result.data) {
      res.json({
        success: true,
        inclusivity: result.data,
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to check content' });
    }
  } catch (error) {
    console.error('Error checking content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// WEEKLY WORKFLOW ENDPOINTS
// =============================================================================

/**
 * Get scheduler status
 */
app.get('/api/workflow/scheduler/status', (_req, res) => {
  const status = workflowScheduler.getStatus();
  res.json({
    success: true,
    scheduler: status,
  });
});

/**
 * Start scheduler
 */
app.post('/api/workflow/scheduler/start', (_req, res) => {
  workflowScheduler.start();
  res.json({
    success: true,
    message: 'Scheduler started',
    scheduler: workflowScheduler.getStatus(),
  });
});

/**
 * Stop scheduler
 */
app.post('/api/workflow/scheduler/stop', (_req, res) => {
  workflowScheduler.stop();
  res.json({
    success: true,
    message: 'Scheduler stopped',
  });
});

/**
 * Update scheduler configuration
 */
app.post('/api/workflow/scheduler/config', (req, res) => {
  const { dayOfWeek, hour, minute, enabled } = req.body;
  workflowScheduler.updateConfig({
    dayOfWeek,
    hour,
    minute,
    enabled,
  });
  res.json({
    success: true,
    scheduler: workflowScheduler.getStatus(),
  });
});

/**
 * Trigger workflow manually
 */
app.post('/api/workflow/trigger', workflowLimiter, validate(WorkflowTriggerSchema), async (req, res) => {
  try {
    const { platforms, postsPerPlatform, skipVideoGeneration, skipImageGeneration } = req.body;

    // Run workflow in background with proper error handling
    workflowScheduler.triggerWorkflow('manual', {
      platforms: platforms as SocialPlatform[],
      postsPerPlatform,
      skipVideoGeneration,
      skipImageGeneration,
    }).catch((error) => {
      console.error('Background workflow failed:', error);
    });

    res.json({
      success: true,
      message: 'Workflow triggered - running in background',
    });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({ error: 'Failed to trigger workflow' });
  }
});

/**
 * Get all workflows
 */
app.get('/api/workflow/list', async (_req, res) => {
  try {
    const workflows = await contentStorage.getAllWorkflows();
    res.json({
      success: true,
      workflows: workflows.map((w) => ({
        id: w.id,
        weekStartDate: w.weekStartDate,
        weekEndDate: w.weekEndDate,
        status: w.status,
        currentStage: w.currentStage,
        createdAt: w.createdAt,
        completedAt: w.completedAt,
        totalPosts: w.posts.length,
        metrics: w.metrics,
      })),
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * Get specific workflow
 */
app.get('/api/workflow/:id', async (req, res) => {
  try {
    const workflow = await contentStorage.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * Get current workflow status
 */
app.get('/api/workflow/current/status', (_req, res) => {
  const currentWorkflow = workflowOrchestrator.getWorkflowStatus();
  res.json({
    success: true,
    workflow: currentWorkflow,
    hasActiveWorkflow: currentWorkflow !== null,
  });
});

/**
 * Get posts for a specific date
 */
app.get('/api/workflow/posts/date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const posts = await contentStorage.getPostsForDate(date);
    res.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * Get posts by status
 */
app.get('/api/workflow/posts/status/:status', async (req, res) => {
  try {
    const status = req.params.status as 'draft' | 'ready' | 'approved' | 'published' | 'failed';
    const posts = await contentStorage.getPostsByStatus(status);
    res.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * Update post status (approve, etc.)
 */
app.post('/api/workflow/posts/:id/status', validate(PostStatusSchema), async (req, res) => {
  try {
    const { status } = req.body;
    const success = await workflowOrchestrator.updatePostStatus(req.params.id, status);
    if (success) {
      res.json({ success: true, message: `Post ${status}` });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    console.error('Error updating post:', error);
    sendWorkflowMutationError(
      error,
      res,
      error instanceof Error ? error.message : 'Failed to update post'
    );
  }
});

/**
 * Get storage statistics
 */
app.get('/api/workflow/stats', async (_req, res) => {
  try {
    const stats = await contentStorage.getStorageStats();
    const schedulerStatus = workflowScheduler.getStatus();
    res.json({
      success: true,
      stats,
      scheduler: schedulerStatus,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get ready-to-post content for the week
 */
app.get('/api/workflow/ready-posts', async (_req, res) => {
  try {
    const readyPosts = await contentStorage.getPostsByStatus('ready');
    const approvedPosts = await contentStorage.getPostsByStatus('approved');
    res.json({
      success: true,
      readyPosts,
      approvedPosts,
      totalReady: readyPosts.length + approvedPosts.length,
    });
  } catch (error) {
    console.error('Error fetching ready posts:', error);
    res.status(500).json({ error: 'Failed to fetch ready posts' });
  }
});

// =============================================================================
// STAGE-BY-STAGE WORKFLOW ENDPOINTS
// =============================================================================

/**
 * Approve current stage and continue to next stage
 */
app.post('/api/workflow/:id/approve-stage', async (req, res) => {
  try {
    const { skipVideoGeneration, skipImageGeneration, expectedStage } = req.body;
    if (!isWorkflowStage(expectedStage)) {
      res.status(400).json({ error: 'expectedStage is required' });
      return;
    }

    const workflow = await workflowOrchestrator.approveStageAndContinue(
      req.params.id,
      { expectedStage, skipVideoGeneration, skipImageGeneration }
    );
    res.json({
      success: true,
      workflow,
      message: `Stage approved - ${workflow.awaitingApproval ? 'awaiting next approval' : 'workflow complete'}`,
    });
  } catch (error) {
    console.error('Error approving stage:', error);
    sendWorkflowMutationError(
      error,
      res,
      error instanceof Error ? error.message : 'Failed to approve stage'
    );
  }
});

/**
 * Edit post content (caption, hashtags, CTA)
 */
app.put('/api/workflow/:workflowId/post/:postId', async (req, res) => {
  try {
    const { caption, hashtags, callToAction } = req.body;
    const post = await workflowOrchestrator.editPostContent(req.params.workflowId, {
      postId: req.params.postId,
      caption,
      hashtags,
      callToAction,
    });
    if (post) {
      res.json({ success: true, post });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    console.error('Error editing post:', error);
    sendWorkflowMutationError(error, res, 'Failed to edit post');
  }
});

/**
 * Edit calendar entry (planned post)
 */
app.put('/api/workflow/:workflowId/calendar/:postId', async (req, res) => {
  try {
    const { scheduledDate, scheduledTime, topic, briefDescription, platform, contentType, category } = req.body;
    const plannedPost = await workflowOrchestrator.editCalendarEntry(req.params.workflowId, {
      postId: req.params.postId,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      scheduledTime,
      topic,
      briefDescription,
      platform,
      contentType,
      category,
    });
    if (plannedPost) {
      res.json({ success: true, plannedPost });
    } else {
      res.status(404).json({ error: 'Calendar entry not found' });
    }
  } catch (error) {
    console.error('Error editing calendar entry:', error);
    sendWorkflowMutationError(error, res, 'Failed to edit calendar entry');
  }
});

/**
 * Regenerate an asset with a new prompt
 */
app.post('/api/workflow/:workflowId/asset/:assetId/regenerate', async (req, res) => {
  try {
    const { postId, newPrompt, type } = req.body;
    if (!postId || !newPrompt || !type) {
      return res.status(400).json({ error: 'postId, newPrompt, and type are required' });
    }
    const asset = await workflowOrchestrator.regenerateAsset(req.params.workflowId, {
      assetId: req.params.assetId,
      postId,
      newPrompt,
      type,
    });
    if (asset) {
      res.json({ success: true, asset });
    } else {
      res.status(404).json({ error: 'Asset not found' });
    }
  } catch (error) {
    console.error('Error regenerating asset:', error);
    sendWorkflowMutationError(error, res, 'Failed to regenerate asset');
  }
});

/**
 * Get detailed stage output for a workflow
 */
app.get('/api/workflow/:id/stage/:stage', async (req, res) => {
  try {
    const workflow = await contentStorage.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const stage = req.params.stage as string;
    let output: unknown = null;

    switch (stage) {
      case 'strategy':
        output = {
          strategy: workflow.strategy,
          plannedPosts: workflow.strategy?.posts || [],
        };
        break;
      case 'copywriting':
        output = {
          posts: workflow.posts.map(p => ({
            id: p.id,
            platform: p.platform,
            contentType: p.contentType,
            category: p.category,
            scheduledDate: p.scheduledDate,
            caption: p.caption,
            hashtags: p.hashtags,
            callToAction: p.callToAction,
            imagePrompts: p.images.map(i => ({ id: i.id, prompt: i.prompt })),
            videoPrompts: p.videos.map(v => ({ id: v.id, prompt: v.prompt })),
          })),
        };
        break;
      case 'image-generation':
        output = {
          posts: workflow.posts.map(p => ({
            id: p.id,
            platform: p.platform,
            images: p.images,
          })),
          totalImages: workflow.metrics.imagesGenerated,
        };
        break;
      case 'video-generation':
        output = {
          posts: workflow.posts.map(p => ({
            id: p.id,
            platform: p.platform,
            videos: p.videos,
          })),
          totalVideos: workflow.metrics.videosGenerated,
        };
        break;
      case 'assembly':
        output = {
          posts: workflow.posts.map(p => ({
            id: p.id,
            platform: p.platform,
            status: p.status,
            scheduledDate: p.scheduledDate,
            scheduledTime: p.scheduledTime,
            caption: p.caption,
            hashtags: p.hashtags,
            platformFormatting: p.platformFormatting,
            images: p.images,
            videos: p.videos,
          })),
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid stage' });
    }

    res.json({
      success: true,
      stage,
      output,
      isCurrentStage: workflow.currentStage === stage,
      awaitingApproval: workflow.awaitingApproval && workflow.currentStage === stage,
    });
  } catch (error) {
    console.error('Error fetching stage output:', error);
    res.status(500).json({ error: 'Failed to fetch stage output' });
  }
});

// Serve React app for all non-API routes (must be after API routes)
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// Start server
async function startServer(): Promise<void> {
  await recoverInterruptedWorkflowState();

  app.listen(PORT, HOST, () => {
    const networkInterfaces = Object.values(os.networkInterfaces())
      .flat()
      .filter((iface): iface is os.NetworkInterfaceInfo =>
        iface !== undefined && iface.family === 'IPv4' && !iface.internal)
      .map((iface) => iface.address);

    console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   🏔️  Apres Feels Content Portal                         ║
  ║                                                          ║
  ║   Portal ready at:                                       ║
  ║   - Local:   http://localhost:${PORT}                     ║
  ║   - Network: http://${networkInterfaces[0] || 'localhost'}:${PORT}                  ║
  ║                                                          ║
  ║   Open the URL above in your browser!                    ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});

export default app;
