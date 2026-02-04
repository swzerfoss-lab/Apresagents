import { BaseAgent } from './BaseAgent.js';
import type {
  BrandConfig,
  Product,
  SocialPlatform,
  ContentType,
  AgentResponse,
} from '../types/index.js';

/**
 * Visual Content Agent
 * Responsible for generating image prompts, visual concepts, and style guidelines
 */
export class VisualContentAgent extends BaseAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Visual Content Agent',
        description: 'Creates visual concepts, image prompts, and style guidelines',
        systemPrompt: `You are an expert visual content strategist and art director specializing in skincare and beauty brands. Your expertise includes:

1. Creating detailed prompts for AI image generation (Midjourney, DALL-E, Stable Diffusion)
2. Developing visual concepts that align with brand aesthetics
3. Understanding platform-specific visual requirements
4. Crafting mood boards and style guidelines
5. Suggesting photo/video shoot concepts

Visual Style Principles for Skincare:
- Clean, fresh, and luminous aesthetics
- Focus on skin texture, glow, and natural beauty
- Soft, diffused lighting (golden hour, window light)
- Neutral or pastel color palettes with strategic pops of color
- Minimalist compositions with hero product focus
- Lifestyle imagery that evokes self-care moments
- Diversity and inclusivity in representation

Platform Visual Requirements:
- Instagram Feed: 1:1 or 4:5, cohesive grid aesthetic
- Instagram Stories/Reels: 9:16, dynamic, eye-catching
- TikTok: 9:16, authentic, less polished acceptable
- Facebook: 1.91:1 for links, 1:1 for engagement
- Pinterest: 2:3 vertical, text overlay friendly

Always provide detailed, specific prompts that would generate consistent brand imagery.`,
        temperature: 0.8,
      },
      brandConfig
    );
  }

  /**
   * Generate an AI image prompt for content
   */
  async generateImagePrompt(
    concept: string,
    platform: SocialPlatform,
    product?: Product
  ): Promise<
    AgentResponse<{
      prompt: string;
      negativePrompt: string;
      aspectRatio: string;
      style: string;
      mood: string;
    }>
  > {
    const aspectRatios: Record<SocialPlatform, string> = {
      instagram: '1:1 or 4:5',
      tiktok: '9:16',
      facebook: '1:1',
      pinterest: '2:3',
    };

    const prompt = `Create a detailed AI image generation prompt for: "${concept}"

Platform: ${platform} (preferred aspect ratio: ${aspectRatios[platform]})
${product ? `Product to feature: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "prompt": "Detailed prompt for AI image generation (be specific about composition, lighting, colors, style, etc.)",
  "negativePrompt": "Elements to avoid in the image",
  "aspectRatio": "${aspectRatios[platform]}",
  "style": "The visual style (e.g., 'editorial beauty photography', 'lifestyle flat lay', etc.)",
  "mood": "The emotional mood of the image"
}
\`\`\`

Make the prompt detailed enough to generate consistent, on-brand imagery.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const data = this.parseJSON<{
      prompt: string;
      negativePrompt: string;
      aspectRatio: string;
      style: string;
      mood: string;
    }>(response.data!);

    if (!data) {
      return { success: false, error: 'Failed to parse image prompt response' };
    }

    return { success: true, data, usage: response.usage };
  }

  /**
   * Generate a series of visual concepts for a campaign
   */
  async generateCampaignVisuals(
    campaignTheme: string,
    platforms: SocialPlatform[],
    numberOfConcepts: number = 5
  ): Promise<
    AgentResponse<
      Array<{
        concept: string;
        description: string;
        platforms: SocialPlatform[];
        imagePrompt: string;
        contentTypes: ContentType[];
      }>
    >
  > {
    const prompt = `Create ${numberOfConcepts} visual concepts for a campaign themed: "${campaignTheme}"

Target platforms: ${platforms.join(', ')}

Output in JSON format:
\`\`\`json
[
  {
    "concept": "Brief concept name",
    "description": "Detailed description of the visual concept",
    "platforms": ["instagram", "tiktok"],
    "imagePrompt": "Detailed AI image generation prompt",
    "contentTypes": ["post", "reel", "story"]
  }
]
\`\`\`

Ensure variety in visual approaches while maintaining brand consistency.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concepts = this.parseJSON<
      Array<{
        concept: string;
        description: string;
        platforms: SocialPlatform[];
        imagePrompt: string;
        contentTypes: ContentType[];
      }>
    >(response.data!);

    if (!concepts) {
      return { success: false, error: 'Failed to parse campaign visuals response' };
    }

    return { success: true, data: concepts, usage: response.usage };
  }

  /**
   * Generate product photography concept
   */
  async generateProductPhotoConcept(
    product: Product,
    style: 'hero' | 'lifestyle' | 'flatlay' | 'texture' | 'before-after'
  ): Promise<
    AgentResponse<{
      concept: string;
      props: string[];
      lighting: string;
      background: string;
      composition: string;
      imagePrompt: string;
    }>
  > {
    const prompt = `Create a ${style} product photography concept for:

Product: ${product.name}
Description: ${product.description}
Key Ingredients: ${product.keyIngredients.join(', ')}
Category: ${product.category}

Output in JSON format:
\`\`\`json
{
  "concept": "Brief description of the overall concept",
  "props": ["list", "of", "props", "to", "include"],
  "lighting": "Detailed lighting setup description",
  "background": "Background description",
  "composition": "How elements should be arranged",
  "imagePrompt": "Complete AI image generation prompt"
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concept = this.parseJSON<{
      concept: string;
      props: string[];
      lighting: string;
      background: string;
      composition: string;
      imagePrompt: string;
    }>(response.data!);

    if (!concept) {
      return { success: false, error: 'Failed to parse product photo concept response' };
    }

    return { success: true, data: concept, usage: response.usage };
  }

  /**
   * Generate video/reel concept
   */
  async generateVideoContent(
    topic: string,
    platform: 'instagram' | 'tiktok',
    duration: '15s' | '30s' | '60s' = '30s'
  ): Promise<
    AgentResponse<{
      hook: string;
      scenes: Array<{
        timestamp: string;
        visual: string;
        text?: string;
        audio?: string;
      }>;
      callToAction: string;
      trendingAudio?: string;
      transitions: string[];
    }>
  > {
    const prompt = `Create a ${duration} ${platform} video/reel concept for: "${topic}"

Output in JSON format:
\`\`\`json
{
  "hook": "The opening hook (first 1-3 seconds)",
  "scenes": [
    {
      "timestamp": "0:00-0:03",
      "visual": "Description of what's shown",
      "text": "Any on-screen text",
      "audio": "Audio/voiceover description"
    }
  ],
  "callToAction": "End CTA",
  "trendingAudio": "Suggested trending audio style or specific track",
  "transitions": ["List of transition suggestions"]
}
\`\`\`

Make it engaging, trend-aware, and optimized for the platform's algorithm.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const videoConcept = this.parseJSON<{
      hook: string;
      scenes: Array<{
        timestamp: string;
        visual: string;
        text?: string;
        audio?: string;
      }>;
      callToAction: string;
      trendingAudio?: string;
      transitions: string[];
    }>(response.data!);

    if (!videoConcept) {
      return { success: false, error: 'Failed to parse video concept response' };
    }

    return { success: true, data: videoConcept, usage: response.usage };
  }

  /**
   * Generate carousel/multi-image concept
   */
  async generateCarouselConcept(
    topic: string,
    slides: number = 5
  ): Promise<
    AgentResponse<{
      theme: string;
      slides: Array<{
        slideNumber: number;
        headline: string;
        bodyText: string;
        visualDescription: string;
        imagePrompt: string;
      }>;
      designNotes: string;
    }>
  > {
    const prompt = `Create a ${slides}-slide carousel concept for: "${topic}"

Output in JSON format:
\`\`\`json
{
  "theme": "Overall carousel theme/style",
  "slides": [
    {
      "slideNumber": 1,
      "headline": "Slide headline",
      "bodyText": "Supporting text",
      "visualDescription": "What's shown visually",
      "imagePrompt": "AI image prompt for this slide"
    }
  ],
  "designNotes": "Overall design consistency notes"
}
\`\`\`

Structure it to encourage swiping and save engagement.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const carousel = this.parseJSON<{
      theme: string;
      slides: Array<{
        slideNumber: number;
        headline: string;
        bodyText: string;
        visualDescription: string;
        imagePrompt: string;
      }>;
      designNotes: string;
    }>(response.data!);

    if (!carousel) {
      return { success: false, error: 'Failed to parse carousel concept response' };
    }

    return { success: true, data: carousel, usage: response.usage };
  }

  /**
   * Generate brand style guide suggestions
   */
  async generateStyleGuide(): Promise<AgentResponse<string>> {
    const prompt = `Create a visual style guide for our skincare brand based on:
- Brand: ${this.brandConfig.name}
- Description: ${this.brandConfig.description}
- Tone: ${this.brandConfig.tone.join(', ')}
- Target Audience: ${this.brandConfig.targetAudience}

Include recommendations for:
1. Color palette (primary, secondary, accent colors with hex codes)
2. Typography suggestions
3. Photography style guidelines
4. Graphic elements and patterns
5. Do's and Don'ts
6. Platform-specific adaptations`;

    return this.singleQuery(prompt);
  }
}
