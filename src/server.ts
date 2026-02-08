import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import {
  SocialMediaManagerAgent,
  VideoContentAgent,
  ContentStrategyAgent,
  BrandVoiceAgent,
} from './agents/index.js';
import { getBrandConfig, sampleProducts, validateConfig } from './config/index.js';
import type { SocialPlatform, CampaignObjective } from './types/index.js';

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
const strategyAgent = new ContentStrategyAgent(brandConfig);
const brandVoiceAgent = new BrandVoiceAgent(brandConfig);

// Create Express app
const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    agents: {
      manager: 'ready',
      video: videoAgent.isVideoGenerationAvailable() ? 'ready' : 'no-api-key',
      strategy: 'ready',
      brandVoice: 'ready',
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

/**
 * Generate content for platforms
 */
app.post('/api/content/generate', async (req, res) => {
  try {
    const { topic, platforms, category, productId } = req.body;

    if (!topic || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Topic and platforms are required' });
    }

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

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   🏔️  Apres Feels Content Portal API                     ║
  ║                                                          ║
  ║   Server running at http://localhost:${PORT}              ║
  ║                                                          ║
  ║   Endpoints:                                             ║
  ║   - GET  /api/health          Health check               ║
  ║   - GET  /api/brand           Brand info                 ║
  ║   - GET  /api/products        Product list               ║
  ║   - POST /api/content/generate   Generate content        ║
  ║   - POST /api/video/generate     Video concept           ║
  ║   - POST /api/video/campaign     Video campaign          ║
  ║   - POST /api/campaign/create    Ad campaign             ║
  ║   - POST /api/calendar/generate  Content calendar        ║
  ║   - POST /api/brand/guidelines   Brand guidelines        ║
  ║   - POST /api/brand/check        Brand voice check       ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
