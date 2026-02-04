import { BaseAgent } from './BaseAgent.js';
import { ContentStrategyAgent } from './ContentStrategyAgent.js';
import { CopywritingAgent } from './CopywritingAgent.js';
import { VisualContentAgent } from './VisualContentAgent.js';
import { AdCampaignAgent } from './AdCampaignAgent.js';
import { BrandVoiceAgent } from './BrandVoiceAgent.js';
import {
  InstagramAgent,
  TikTokAgent,
  FacebookAgent,
  PinterestAgent,
} from './platforms/index.js';
import type {
  BrandConfig,
  SocialPlatform,
  ContentType,
  ContentRequest,
  GeneratedContent,
  ContentCalendar,
  ContentCalendarRequest,
  AdCampaign,
  AdCampaignRequest,
  Product,
  AgentResponse,
} from '../types/index.js';

/**
 * Social Media Manager Agent
 * The main orchestrator that coordinates all sub-agents to create comprehensive content
 */
export class SocialMediaManagerAgent extends BaseAgent {
  // Sub-agents
  private strategyAgent: ContentStrategyAgent;
  private copywritingAgent: CopywritingAgent;
  private visualAgent: VisualContentAgent;
  private adCampaignAgent: AdCampaignAgent;
  private brandVoiceAgent: BrandVoiceAgent;

  // Platform agents
  private platformAgents: Record<SocialPlatform, InstagramAgent | TikTokAgent | FacebookAgent | PinterestAgent>;

  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Social Media Manager',
        description: 'Orchestrates all content creation agents for comprehensive social media management',
        systemPrompt: `You are a senior social media manager coordinating a team of specialized AI agents to create content for a skincare brand. Your role is to:

1. Understand the content request and determine which specialists to involve
2. Coordinate between agents to create cohesive, complete content packages
3. Ensure brand consistency across all outputs
4. Optimize content for each platform while maintaining a unified message
5. Provide strategic recommendations based on best practices

When given a request, think through:
- What type of content is needed?
- Which platforms should this content target?
- What specialists need to be involved?
- How should the content be adapted for each platform?
- What visual assets are needed?
- Is brand voice review needed?

Always aim to deliver complete, ready-to-post content packages.`,
        temperature: 0.7,
      },
      brandConfig
    );

    // Initialize sub-agents
    this.strategyAgent = new ContentStrategyAgent(brandConfig);
    this.copywritingAgent = new CopywritingAgent(brandConfig);
    this.visualAgent = new VisualContentAgent(brandConfig);
    this.adCampaignAgent = new AdCampaignAgent(brandConfig);
    this.brandVoiceAgent = new BrandVoiceAgent(brandConfig);

    // Initialize platform agents
    this.platformAgents = {
      instagram: new InstagramAgent(brandConfig),
      tiktok: new TikTokAgent(brandConfig),
      facebook: new FacebookAgent(brandConfig),
      pinterest: new PinterestAgent(brandConfig),
    };
  }

  /**
   * Generate complete content package for a topic across multiple platforms
   */
  async generateContentPackage(
    topic: string,
    platforms: SocialPlatform[],
    product?: Product
  ): Promise<
    AgentResponse<{
      topic: string;
      content: Record<SocialPlatform, GeneratedContent>;
      visualPrompts: string[];
      brandVoiceCheck: { score: number; feedback: string };
    }>
  > {
    const results: Record<string, GeneratedContent> = {};
    const visualPrompts: string[] = [];

    // Generate content for each platform
    for (const platform of platforms) {
      const platformAgent = this.platformAgents[platform];

      // Determine best content type for each platform
      const contentType = this.getBestContentType(platform, topic);

      const contentResult = await platformAgent.generateContent(topic, contentType, product);

      if (contentResult.success && contentResult.data) {
        results[platform] = contentResult.data;
        visualPrompts.push(contentResult.data.visualPrompt);
      }
    }

    // Get one piece of content for brand voice check
    const sampleContent = Object.values(results)[0];
    let brandCheck = { score: 0, feedback: '' };

    if (sampleContent) {
      const voiceReview = await this.brandVoiceAgent.reviewContent(
        sampleContent.caption,
        platforms[0]
      );

      if (voiceReview.success && voiceReview.data) {
        brandCheck = {
          score: voiceReview.data.overallScore,
          feedback: voiceReview.data.suggestions.join('; '),
        };
      }
    }

    return {
      success: true,
      data: {
        topic,
        content: results as Record<SocialPlatform, GeneratedContent>,
        visualPrompts: [...new Set(visualPrompts)], // Dedupe
        brandVoiceCheck: brandCheck,
      },
    };
  }

  /**
   * Create a full content calendar with detailed content
   */
  async createDetailedCalendar(
    request: ContentCalendarRequest,
    generateContent: boolean = false
  ): Promise<AgentResponse<ContentCalendar>> {
    // Get the base calendar from strategy agent
    const calendarResult = await this.strategyAgent.generateCalendar(request);

    if (!calendarResult.success || !calendarResult.data) {
      return { success: false, error: calendarResult.error };
    }

    const calendar = calendarResult.data;

    // Optionally generate full content for each entry
    if (generateContent) {
      for (const entry of calendar.entries) {
        const platformAgent = this.platformAgents[entry.platform];
        const contentResult = await platformAgent.generateContent(
          entry.theme,
          entry.contentType,
          request.products?.[0]
        );

        if (contentResult.success && contentResult.data) {
          entry.content = contentResult.data;
        }
      }
    }

    return { success: true, data: calendar };
  }

  /**
   * Create a complete ad campaign
   */
  async createAdCampaign(request: AdCampaignRequest): Promise<AgentResponse<AdCampaign>> {
    return this.adCampaignAgent.createCampaign(request);
  }

  /**
   * Generate content ideas based on strategy
   */
  async brainstormContent(
    theme: string,
    platforms: SocialPlatform[],
    count: number = 10
  ): Promise<AgentResponse<string[]>> {
    return this.strategyAgent.getContentIdeas(theme, platforms, count);
  }

  /**
   * Create video content (Reel/TikTok) with full production details
   */
  async createVideoContent(
    topic: string,
    platform: 'instagram' | 'tiktok',
    product?: Product
  ): Promise<AgentResponse<{
    script: unknown;
    visualConcept: unknown;
    caption: { caption: string; hashtags: string[]; callToAction: string };
  }>> {
    // Get video script from platform agent
    const platformAgent = platform === 'instagram'
      ? (this.platformAgents.instagram as InstagramAgent)
      : (this.platformAgents.tiktok as TikTokAgent);

    let scriptResult;
    if (platform === 'instagram') {
      scriptResult = await (platformAgent as InstagramAgent).generateReelConcept(topic, product);
    } else {
      scriptResult = await (platformAgent as TikTokAgent).generateVideoScript(
        topic,
        'educational',
        '30s',
        product
      );
    }

    if (!scriptResult.success) {
      return { success: false, error: scriptResult.error };
    }

    // Get visual concept
    const visualResult = await this.visualAgent.generateVideoContent(topic, platform, '30s');

    // Get optimized caption
    const captionResult = await this.copywritingAgent.generateCaption(platform, topic, product);

    return {
      success: true,
      data: {
        script: scriptResult.data,
        visualConcept: visualResult.data,
        caption: captionResult.data || { caption: '', hashtags: [], callToAction: '' },
      },
    };
  }

  /**
   * Create carousel/educational content
   */
  async createCarouselContent(
    topic: string,
    slides: number = 5
  ): Promise<AgentResponse<{
    carousel: unknown;
    caption: { caption: string; hashtags: string[]; callToAction: string };
  }>> {
    const carouselResult = await this.visualAgent.generateCarouselConcept(topic, slides);

    if (!carouselResult.success) {
      return { success: false, error: carouselResult.error };
    }

    const captionResult = await this.copywritingAgent.generateCaption('instagram', topic);

    return {
      success: true,
      data: {
        carousel: carouselResult.data,
        caption: captionResult.data || { caption: '', hashtags: [], callToAction: '' },
      },
    };
  }

  /**
   * Get content strategy for a time period
   */
  async getContentStrategy(
    duration: 'monthly' | 'quarterly',
    focus?: string
  ): Promise<AgentResponse<unknown>> {
    return this.strategyAgent.generateStrategy(duration, focus);
  }

  /**
   * Review and optimize existing content
   */
  async reviewContent(
    content: string,
    platform: SocialPlatform
  ): Promise<AgentResponse<{
    brandReview: unknown;
    optimizedContent: string;
    hashtags: { primary: string[]; secondary: string[]; branded: string[] };
  }>> {
    // Get brand voice review
    const brandReview = await this.brandVoiceAgent.reviewContent(content, platform);

    // Get optimized version
    const optimizedResult = await this.platformAgents[platform].optimizeContent(content);

    // Get hashtag suggestions
    const hashtagResult = await this.copywritingAgent.generateHashtags(content, platform);

    return {
      success: true,
      data: {
        brandReview: brandReview.data,
        optimizedContent: optimizedResult.data || content,
        hashtags: hashtagResult.data || { primary: [], secondary: [], branded: [] },
      },
    };
  }

  /**
   * Generate brand guidelines
   */
  async generateBrandGuidelines(): Promise<AgentResponse<{
    voiceGuidelines: unknown;
    visualGuidelines: string;
  }>> {
    const voiceResult = await this.brandVoiceAgent.generateVoiceGuidelines();
    const visualResult = await this.visualAgent.generateStyleGuide();

    return {
      success: true,
      data: {
        voiceGuidelines: voiceResult.data,
        visualGuidelines: visualResult.data || '',
      },
    };
  }

  /**
   * Helper: Determine best content type for platform
   */
  private getBestContentType(platform: SocialPlatform, _topic: string): ContentType {
    const platformDefaults: Record<SocialPlatform, ContentType> = {
      instagram: 'post',
      tiktok: 'video',
      facebook: 'post',
      pinterest: 'pin',
    };
    return platformDefaults[platform];
  }

  /**
   * Get access to individual agents for advanced usage
   */
  getAgents() {
    return {
      strategy: this.strategyAgent,
      copywriting: this.copywritingAgent,
      visual: this.visualAgent,
      adCampaign: this.adCampaignAgent,
      brandVoice: this.brandVoiceAgent,
      platforms: this.platformAgents,
    };
  }
}
