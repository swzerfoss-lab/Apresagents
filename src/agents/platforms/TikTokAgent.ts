import { BasePlatformAgent, PlatformSpecs } from './BasePlatformAgent.js';
import type { BrandConfig, Product, AgentResponse } from '../../types/index.js';

const tiktokSpecs: PlatformSpecs = {
  platform: 'tiktok',
  maxCaptionLength: 4000,
  maxHashtags: 5,
  supportedContentTypes: ['video', 'story'],
  optimalPostTimes: ['7-9 AM', '12-3 PM', '7-11 PM'],
  aspectRatios: {
    post: '9:16',
    story: '9:16',
    reel: '9:16',
    carousel: '9:16',
    video: '9:16',
    pin: '9:16',
    ad: '9:16',
  },
  bestPractices: [
    'Hook viewers in the first 1-3 seconds or lose them',
    'Use trending sounds and participate in trends authentically',
    'Keep videos 15-60 seconds for optimal completion rate',
    'Use text overlays - many watch without sound',
    'Post consistently (1-3 times per day ideal)',
    'Engage with comments immediately after posting',
    'Use fewer but highly relevant hashtags',
    'Embrace authenticity over polish - raw performs better',
  ],
};

/**
 * TikTok-specialized agent
 */
export class TikTokAgent extends BasePlatformAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      brandConfig,
      tiktokSpecs,
      `## TikTok-Specific Expertise
You understand:
- TikTok's unique culture and humor
- How to participate in trends authentically for brands
- The importance of the hook and watch time
- How the FYP algorithm works
- Duet and Stitch opportunities
- TikTok Shop integration
- Creator collaboration strategies
- Sound and music trends
- The difference between polished and authentic content`
    );
  }

  /**
   * Generate TikTok video concept
   */
  async generateVideoScript(
    topic: string,
    style: 'educational' | 'entertaining' | 'trend' | 'storytelling' | 'tutorial',
    duration: '15s' | '30s' | '60s' = '30s',
    product?: Product
  ): Promise<
    AgentResponse<{
      hook: string;
      script: string;
      scenes: Array<{
        timestamp: string;
        action: string;
        dialogue: string;
        textOverlay: string;
      }>;
      sound: string;
      hashtags: string[];
      caption: string;
      engagementTactic: string;
    }>
  > {
    const prompt = `Create a ${duration} ${style} TikTok video for: "${topic}"
${product ? `\nFeatured Product: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "hook": "The scroll-stopping first 1-3 seconds",
  "script": "Full script/dialogue",
  "scenes": [
    {
      "timestamp": "0:00-0:03",
      "action": "What's happening visually",
      "dialogue": "What's being said",
      "textOverlay": "On-screen text"
    }
  ],
  "sound": "Trending sound suggestion or original audio description",
  "hashtags": ["skincare", "fyp", "trend", "etc"],
  "caption": "TikTok-style caption (can be short/punchy)",
  "engagementTactic": "How to encourage comments/shares/saves"
}
\`\`\`

Make it feel native to TikTok - authentic, engaging, and shareable.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const script = this.parseJSON<{
      hook: string;
      script: string;
      scenes: Array<{
        timestamp: string;
        action: string;
        dialogue: string;
        textOverlay: string;
      }>;
      sound: string;
      hashtags: string[];
      caption: string;
      engagementTactic: string;
    }>(response.data!);

    if (!script) {
      return { success: false, error: 'Failed to parse video script response' };
    }

    return { success: true, data: script, usage: response.usage };
  }

  /**
   * Generate trend participation concept
   */
  async generateTrendConcept(
    trendDescription: string,
    product?: Product
  ): Promise<
    AgentResponse<{
      trendAdaptation: string;
      script: string;
      brandIntegration: string;
      sound: string;
      hashtags: string[];
      caption: string;
      riskAssessment: string;
    }>
  > {
    const prompt = `Create a concept to participate in this TikTok trend for our skincare brand:

Trend: "${trendDescription}"
${product ? `\nProduct to feature: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "trendAdaptation": "How we're adapting this trend for our brand",
  "script": "The full video script",
  "brandIntegration": "How the brand/product is naturally incorporated",
  "sound": "The sound to use",
  "hashtags": ["trend", "hashtags"],
  "caption": "Engaging caption",
  "riskAssessment": "Any potential risks or considerations"
}
\`\`\`

Ensure the trend participation feels authentic, not forced or cringey.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concept = this.parseJSON<{
      trendAdaptation: string;
      script: string;
      brandIntegration: string;
      sound: string;
      hashtags: string[];
      caption: string;
      riskAssessment: string;
    }>(response.data!);

    if (!concept) {
      return { success: false, error: 'Failed to parse trend concept response' };
    }

    return { success: true, data: concept, usage: response.usage };
  }

  /**
   * Generate educational/tutorial content
   */
  async generateTutorial(
    topic: string,
    product?: Product
  ): Promise<
    AgentResponse<{
      title: string;
      hook: string;
      steps: Array<{
        stepNumber: number;
        instruction: string;
        visual: string;
        tips: string;
      }>;
      callToAction: string;
      hashtags: string[];
      caption: string;
    }>
  > {
    const prompt = `Create a skincare tutorial TikTok for: "${topic}"
${product ? `\nFeatured Product: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "title": "Tutorial title",
  "hook": "Opening hook",
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "What to do",
      "visual": "What's shown",
      "tips": "Pro tips for this step"
    }
  ],
  "callToAction": "End CTA",
  "hashtags": ["skincaretutorial", "etc"],
  "caption": "Educational but engaging caption"
}
\`\`\`

Make it informative but entertaining - edutainment style.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const tutorial = this.parseJSON<{
      title: string;
      hook: string;
      steps: Array<{
        stepNumber: number;
        instruction: string;
        visual: string;
        tips: string;
      }>;
      callToAction: string;
      hashtags: string[];
      caption: string;
    }>(response.data!);

    if (!tutorial) {
      return { success: false, error: 'Failed to parse tutorial response' };
    }

    return { success: true, data: tutorial, usage: response.usage };
  }

  /**
   * Generate series/playlist concept
   */
  async generateSeriesConcept(
    seriesTheme: string,
    numberOfEpisodes: number = 5
  ): Promise<
    AgentResponse<{
      seriesName: string;
      seriesHook: string;
      episodes: Array<{
        episodeNumber: number;
        title: string;
        hook: string;
        content: string;
        cliffhanger?: string;
      }>;
      seriesHashtag: string;
      growthStrategy: string;
    }>
  > {
    const prompt = `Create a ${numberOfEpisodes}-part TikTok series concept for: "${seriesTheme}"

Output in JSON format:
\`\`\`json
{
  "seriesName": "Catchy series name",
  "seriesHook": "Why people should follow the series",
  "episodes": [
    {
      "episodeNumber": 1,
      "title": "Episode title",
      "hook": "Episode-specific hook",
      "content": "What this episode covers",
      "cliffhanger": "Teaser for next episode (if applicable)"
    }
  ],
  "seriesHashtag": "Unique hashtag for this series",
  "growthStrategy": "How this series drives follows and engagement"
}
\`\`\`

Design it to encourage follows and binge-watching.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const series = this.parseJSON<{
      seriesName: string;
      seriesHook: string;
      episodes: Array<{
        episodeNumber: number;
        title: string;
        hook: string;
        content: string;
        cliffhanger?: string;
      }>;
      seriesHashtag: string;
      growthStrategy: string;
    }>(response.data!);

    if (!series) {
      return { success: false, error: 'Failed to parse series concept response' };
    }

    return { success: true, data: series, usage: response.usage };
  }
}
