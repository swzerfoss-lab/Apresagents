import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './BaseAgent.js';
import type {
  BrandConfig,
  Product,
  SocialPlatform,
  ContentType,
  AgentResponse,
} from '../types/index.js';

/**
 * Generated image result from Gemini 3.1 Flash Image
 */
export interface GeneratedImage {
  base64Data: string;
  mimeType: string;
  prompt: string;
  filePath?: string;
}

/**
 * Image generation options for Gemini 3.1 Flash Image
 */
export interface ImageGenerationOptions {
  aspectRatio?: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
  numberOfImages?: number;
  outputDirectory?: string;
  style?: 'photorealistic' | 'artistic' | 'editorial' | 'lifestyle';
}

/**
 * Visual Content Agent
 * Responsible for generating image prompts, visual concepts, and actual images via Gemini 3.1 Flash Image
 */
export class VisualContentAgent extends BaseAgent {
  private genAI: GoogleGenAI | null = null;
  private imageModelName: string = 'gemini-2.0-flash-exp'; // Gemini 2.0 Flash with native image generation

  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Visual Content Agent',
        description: 'Creates visual concepts, image prompts, and generates images via Gemini 3.1 Flash Image',
        systemPrompt: `You are an expert visual content strategist and art director for Apres Feels, a premium winter sports recovery and skincare brand.

## About Apres Feels
Apres Feels (apresfeels.com) is a premium and luxury skincare, muscle care, muscle recovery, and body recovery company for winter sports enthusiasts - skiers, snowboarders, mountaineers, and the après-ski lifestyle.

## Your Visual Expertise
1. Creating detailed prompts for AI image generation optimized for Google Gemini 3.1 Flash Image
2. Developing visual concepts that align with premium mountain lifestyle aesthetics
3. Understanding platform-specific visual requirements
4. Crafting mood boards and style guidelines
5. Suggesting photo/video shoot concepts for winter sports content

## Visual Style Principles for Apres Feels
- **Mountain Luxury**: Crisp alpine environments, premium lodge aesthetics, golden hour on slopes
- **Action & Recovery**: Dynamic ski/snowboard shots contrasted with serene recovery moments
- **Premium Textures**: Rich product photography, natural ingredients, luxurious application
- **Après Lifestyle**: Cozy lodge scenes, fireside relaxation, post-adventure celebrations
- **Natural Elements**: Snow, ice, mountain peaks, pine forests, winter botanicals
- **Color Palette**: Cool blues, crisp whites, warm amber accents, deep forest greens
- **Lighting**: Golden hour on mountains, soft window light in lodges, dramatic alpine skies

## Platform Visual Requirements
- Instagram Feed: 1:1 or 4:5, cohesive grid with mountain/luxury aesthetic
- Instagram Stories/Reels: 9:16, dynamic action or intimate product moments
- TikTok: 9:16, authentic, energetic, trend-aware
- Facebook: 1.91:1 for links, 1:1 for engagement, lifestyle-focused
- Pinterest: 2:3 vertical, text overlay friendly, aspirational

## Image Prompt Guidelines for Gemini 3.1 Flash Image
When creating prompts:
- Be specific about winter sports context and mountain settings
- Include lighting details (alpine golden hour, lodge warmth, etc.)
- Specify the premium/luxury quality expected
- Reference product placement naturally in lifestyle scenes
- Include relevant props (ski gear, lodge elements, natural ingredients)

Always create prompts that will generate consistent, on-brand imagery capturing the spirit of mountain adventure and premium self-care.`,
        temperature: 0.8,
      },
      brandConfig
    );

    // Initialize Gemini client if API key is available
    this.initializeGemini();
  }

  /**
   * Initialize the Gemini client for image generation
   */
  private initializeGemini(): void {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Check if image generation is available
   */
  isImageGenerationAvailable(): boolean {
    return this.genAI !== null;
  }

  /**
   * Generate an image using Gemini 3.1 Flash Image
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<AgentResponse<GeneratedImage>> {
    if (!this.genAI) {
      return {
        success: false,
        error: 'Gemini API key not configured. Set GEMINI_API_KEY in your environment.',
      };
    }

    try {
      // Enhance prompt with brand context
      const enhancedPrompt = this.enhancePromptForBrand(prompt, options.style);

      // Generate image using Gemini 3.1 Flash Image
      const response = await this.genAI.models.generateContent({
        model: this.imageModelName,
        contents: enhancedPrompt,
        config: {
          responseModalities: ['Image', 'Text'],
        },
      });

      // Extract image data from response
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        return { success: false, error: 'No image generated in response' };
      }

      // Find the image part in the response
      for (const part of parts) {
        if (part.inlineData) {
          const imageData: GeneratedImage = {
            base64Data: part.inlineData.data || '',
            mimeType: part.inlineData.mimeType || 'image/png',
            prompt: enhancedPrompt,
          };

          // Optionally save to file
          if (options.outputDirectory) {
            const fileName = `apresfeels_${Date.now()}.png`;
            const filePath = path.join(options.outputDirectory, fileName);
            const buffer = Buffer.from(imageData.base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
            imageData.filePath = filePath;
          }

          return { success: true, data: imageData };
        }
      }

      return { success: false, error: 'No image data found in response' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating image';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate image and save to file
   */
  async generateAndSaveImage(
    prompt: string,
    outputPath: string,
    options: ImageGenerationOptions = {}
  ): Promise<AgentResponse<{ filePath: string; prompt: string }>> {
    const result = await this.generateImage(prompt, {
      ...options,
      outputDirectory: path.dirname(outputPath),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    // If outputDirectory wasn't used, save with the specific path
    if (!result.data.filePath) {
      try {
        const buffer = Buffer.from(result.data.base64Data, 'base64');
        fs.writeFileSync(outputPath, buffer);
        return {
          success: true,
          data: { filePath: outputPath, prompt: result.data.prompt },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save image';
        return { success: false, error: errorMessage };
      }
    }

    return {
      success: true,
      data: { filePath: result.data.filePath, prompt: result.data.prompt },
    };
  }

  /**
   * Generate multiple images for a concept
   */
  async generateImages(
    concept: string,
    platform: SocialPlatform,
    count: number = 3,
    product?: Product
  ): Promise<AgentResponse<GeneratedImage[]>> {
    // First, generate optimized prompts
    const promptResult = await this.generateImagePrompt(concept, platform, product);
    if (!promptResult.success || !promptResult.data) {
      return { success: false, error: promptResult.error };
    }

    const basePrompt = promptResult.data.prompt;
    const images: GeneratedImage[] = [];
    const errors: string[] = [];

    // Generate multiple variations
    for (let i = 0; i < count; i++) {
      const variationPrompt = i === 0 ? basePrompt : `${basePrompt}, variation ${i + 1}, different angle and composition`;
      const result = await this.generateImage(variationPrompt, {
        aspectRatio: this.getAspectRatioForPlatform(platform),
      });

      if (result.success && result.data) {
        images.push(result.data);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }

    if (images.length === 0) {
      return { success: false, error: errors.join('; ') };
    }

    return { success: true, data: images };
  }

  /**
   * Generate product images with brand styling
   */
  async generateProductImages(
    product: Product,
    styles: Array<'hero' | 'lifestyle' | 'flatlay' | 'texture' | 'action' | 'apres-scene'>,
    outputDirectory?: string
  ): Promise<AgentResponse<GeneratedImage[]>> {
    const images: GeneratedImage[] = [];
    const errors: string[] = [];

    for (const style of styles) {
      const conceptResult = await this.generateProductPhotoConcept(product, style);
      if (!conceptResult.success || !conceptResult.data) {
        errors.push(`Failed to generate ${style} concept: ${conceptResult.error}`);
        continue;
      }

      const imageResult = await this.generateImage(conceptResult.data.imagePrompt, {
        outputDirectory,
        style: 'photorealistic',
      });

      if (imageResult.success && imageResult.data) {
        images.push(imageResult.data);
      } else {
        errors.push(`Failed to generate ${style} image: ${imageResult.error}`);
      }
    }

    if (images.length === 0) {
      return { success: false, error: errors.join('; ') };
    }

    return { success: true, data: images };
  }

  /**
   * Enhance a prompt with Apres Feels brand context
   */
  private enhancePromptForBrand(prompt: string, style?: string): string {
    const brandContext = `Premium winter sports and mountain lifestyle brand aesthetic for Apres Feels. `;
    const qualityModifiers = `High-end professional photography quality, cinematic lighting, luxurious premium feel, sharp details. `;
    const styleModifier = style ? `Style: ${style}. ` : 'Style: editorial lifestyle photography. ';
    const colorContext = `Color palette: cool alpine blues, crisp snow whites, warm amber lodge accents, deep forest greens. `;

    return `${brandContext}${styleModifier}${colorContext}${qualityModifiers}${prompt}`;
  }

  /**
   * Get the appropriate aspect ratio for a platform
   */
  private getAspectRatioForPlatform(platform: SocialPlatform): ImageGenerationOptions['aspectRatio'] {
    const ratios: Record<SocialPlatform, ImageGenerationOptions['aspectRatio']> = {
      instagram: '4:3',
      tiktok: '9:16',
      facebook: '1:1',
      pinterest: '3:4',
    };
    return ratios[platform];
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

    const promptText = `Create a detailed AI image generation prompt optimized for Google Gemini 3.1 Flash Image for: "${concept}"

Platform: ${platform} (preferred aspect ratio: ${aspectRatios[platform]})
${product ? `Product to feature: ${product.name} - ${product.description}` : ''}

Remember this is for Apres Feels - a premium winter sports recovery brand. The imagery should evoke:
- Mountain luxury and alpine adventure
- Premium skincare and muscle recovery
- The après-ski lifestyle and culture
- Natural ingredients and healing

Output in JSON format:
\`\`\`json
{
  "prompt": "Detailed prompt for Gemini 3.1 Flash Image (be specific about winter sports context, mountain settings, composition, lighting, colors, premium quality). Make it vivid and descriptive.",
  "negativePrompt": "Elements to avoid in the image",
  "aspectRatio": "${aspectRatios[platform]}",
  "style": "The visual style (e.g., 'alpine editorial photography', 'luxury product shot', 'lifestyle action sports')",
  "mood": "The emotional mood of the image"
}
\`\`\`

Make the prompt detailed enough to generate consistent, on-brand imagery for Apres Feels.`;

    const response = await this.singleQuery(promptText);
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
    const prompt = `Create ${numberOfConcepts} visual concepts for an Apres Feels campaign themed: "${campaignTheme}"

Target platforms: ${platforms.join(', ')}

Remember: Apres Feels is a premium winter sports recovery brand. Concepts should blend:
- Mountain adventure and ski culture
- Premium skincare and muscle recovery
- Après-ski lifestyle and social scenes
- Natural healing and ingredients

Output in JSON format:
\`\`\`json
[
  {
    "concept": "Brief concept name",
    "description": "Detailed description of the visual concept with winter sports/mountain context",
    "platforms": ["instagram", "tiktok"],
    "imagePrompt": "Detailed Gemini 3.1 Flash Image prompt for this concept - be vivid and specific",
    "contentTypes": ["post", "reel", "story"]
  }
]
\`\`\`

Ensure variety in visual approaches while maintaining Apres Feels' premium mountain lifestyle brand.`;

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
    style: 'hero' | 'lifestyle' | 'flatlay' | 'texture' | 'action' | 'apres-scene'
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
    const styleContexts: Record<string, string> = {
      'hero': 'dramatic product hero shot with mountain backdrop',
      'lifestyle': 'product in use during or after winter sports activity',
      'flatlay': 'premium flatlay with ski/mountain lifestyle props',
      'texture': 'close-up of product texture with natural ingredient elements',
      'action': 'product alongside dynamic skiing/snowboarding action',
      'apres-scene': 'product in cozy lodge or après-ski social setting',
    };

    const prompt = `Create a ${style} product photography concept for Apres Feels:

Product: ${product.name}
Description: ${product.description}
Key Ingredients: ${product.keyIngredients.join(', ')}
Category: ${product.category}

Style Context: ${styleContexts[style]}

Output in JSON format:
\`\`\`json
{
  "concept": "Brief description of the overall concept with winter sports context",
  "props": ["list", "of", "props", "including", "ski/mountain", "elements"],
  "lighting": "Detailed lighting setup description (alpine golden hour, lodge warmth, etc.)",
  "background": "Background description with mountain/winter context",
  "composition": "How elements should be arranged",
  "imagePrompt": "Complete Gemini 3.1 Flash Image prompt for this product shot - be vivid, specific, and include all visual details"
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
    const prompt = `Create a ${duration} ${platform} video/reel concept for Apres Feels: "${topic}"

Remember: Apres Feels is a premium winter sports recovery brand. Content should capture:
- Mountain adventure and ski culture
- Premium recovery and skincare moments
- The work hard/play hard lifestyle
- Après-ski social scenes

Output in JSON format:
\`\`\`json
{
  "hook": "The opening hook (first 1-3 seconds) - make it mountain/action focused",
  "scenes": [
    {
      "timestamp": "0:00-0:03",
      "visual": "Description of what's shown (include ski/mountain context)",
      "text": "Any on-screen text",
      "audio": "Audio/voiceover description"
    }
  ],
  "callToAction": "End CTA aligned with Apres Feels brand",
  "trendingAudio": "Suggested trending audio style or specific track that fits mountain lifestyle",
  "transitions": ["List of transition suggestions"]
}
\`\`\`

Make it engaging, trend-aware, and capture the adventurous premium spirit of Apres Feels.`;

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
    const prompt = `Create a ${slides}-slide carousel concept for Apres Feels: "${topic}"

Remember: Apres Feels is a premium winter sports recovery brand. The carousel should:
- Blend education with mountain lifestyle imagery
- Feature premium product and recovery content
- Appeal to ski/snowboard enthusiasts aged 28-55
- Maintain the work hard/play hard aesthetic

Output in JSON format:
\`\`\`json
{
  "theme": "Overall carousel theme/style with mountain aesthetic",
  "slides": [
    {
      "slideNumber": 1,
      "headline": "Slide headline",
      "bodyText": "Supporting text",
      "visualDescription": "What's shown visually (with winter sports context)",
      "imagePrompt": "Gemini 3.1 Flash Image prompt for this slide - be vivid and detailed"
    }
  ],
  "designNotes": "Overall design consistency notes for Apres Feels brand"
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
    const prompt = `Create a comprehensive visual style guide for Apres Feels:

Brand Context:
- Name: ${this.brandConfig.name}
- Description: ${this.brandConfig.description}
- Tone: ${this.brandConfig.tone.join(', ')}
- Target Audience: ${this.brandConfig.targetAudience}

This is a premium winter sports recovery and skincare brand for skiing, snowboarding, and mountain lifestyle enthusiasts.

Include detailed recommendations for:
1. **Color Palette** - Primary, secondary, accent colors with hex codes (think alpine, snow, luxury)
2. **Typography** - Font suggestions that convey premium adventure
3. **Photography Style** - Guidelines for mountain/ski lifestyle and product photography
4. **Graphic Elements** - Patterns, icons, design elements inspired by mountain culture
5. **Image Prompts** - Example Gemini 3.1 Flash Image prompts that capture the brand aesthetic
6. **Do's and Don'ts** - Visual guidelines specific to winter sports luxury branding
7. **Platform Adaptations** - How to adapt visuals for Instagram, TikTok, Facebook, Pinterest`;

    return this.singleQuery(prompt);
  }

  /**
   * Generate a seasonal visual campaign
   */
  async generateSeasonalCampaign(
    season: 'early-season' | 'peak-season' | 'spring-skiing' | 'off-season'
  ): Promise<
    AgentResponse<{
      campaignName: string;
      visualTheme: string;
      colorMood: string;
      keyVisuals: Array<{
        name: string;
        description: string;
        imagePrompt: string;
      }>;
      platforms: Record<SocialPlatform, string>;
    }>
  > {
    const seasonContexts: Record<string, string> = {
      'early-season': 'First chair excitement, fresh snow anticipation, gearing up',
      'peak-season': 'Powder days, epic conditions, peak adventure and recovery',
      'spring-skiing': 'Warm sun, corn snow, deck parties, lighter vibe',
      'off-season': 'Training, preparation, mountain longing, product focus',
    };

    const prompt = `Create a ${season} visual campaign for Apres Feels.

Season Context: ${seasonContexts[season]}

Output in JSON format:
\`\`\`json
{
  "campaignName": "Creative campaign name",
  "visualTheme": "Overall visual theme and mood",
  "colorMood": "Color palette mood for this season",
  "keyVisuals": [
    {
      "name": "Visual concept name",
      "description": "Detailed description",
      "imagePrompt": "Gemini 3.1 Flash Image prompt - be vivid and specific"
    }
  ],
  "platforms": {
    "instagram": "Platform-specific visual approach",
    "tiktok": "Platform-specific visual approach",
    "facebook": "Platform-specific visual approach",
    "pinterest": "Platform-specific visual approach"
  }
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const campaign = this.parseJSON<{
      campaignName: string;
      visualTheme: string;
      colorMood: string;
      keyVisuals: Array<{
        name: string;
        description: string;
        imagePrompt: string;
      }>;
      platforms: Record<SocialPlatform, string>;
    }>(response.data!);

    if (!campaign) {
      return { success: false, error: 'Failed to parse seasonal campaign response' };
    }

    return { success: true, data: campaign, usage: response.usage };
  }
}
