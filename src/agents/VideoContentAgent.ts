import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './BaseAgent.js';
import type {
  BrandConfig,
  Product,
  SocialPlatform,
  AgentResponse,
} from '../types/index.js';
import { validateBufferSize, MAX_VIDEO_SIZE } from '../utils/async.js';

/**
 * Generated video result from Google Veo 3
 */
export interface GeneratedVideo {
  videoData?: string;
  videoUrl?: string;
  mimeType: string;
  prompt: string;
  duration: number;
  resolution: string;
  filePath?: string;
  hasAudio: boolean;
}

/**
 * Video generation options for Veo 3/3.1
 */
export interface VideoGenerationOptions {
  /** Video duration in seconds (4, 6, or 8) */
  duration?: 4 | 6 | 8;
  /** Output resolution - Veo 3.1 supports up to 4K */
  resolution?: '720p' | '1080p' | '4k';
  /** Aspect ratio for the video */
  aspectRatio?: '16:9' | '9:16' | '1:1';
  /** Enable native audio generation (dialogue, SFX, ambient) */
  withAudio?: boolean;
  /** Directory to save generated video */
  outputDirectory?: string;
  /** Visual style preset */
  style?: 'cinematic' | 'documentary' | 'dynamic' | 'lifestyle' | 'commercial';
  /** Use faster generation model (lower quality) */
  useFastModel?: boolean;
  /** Negative prompt - content to avoid generating */
  negativePrompt?: string;
  /** Seed for reproducible results */
  seed?: number;
  /** Person/face generation safety setting */
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all';
}

/**
 * Individual clip for multi-clip video production
 */
export interface VideoClip {
  clipNumber: number;
  duration: number; // seconds (4, 6, or 8)
  veoPrompt: string; // Focused 1-2 sentence prompt for this clip
  description: string; // What this clip shows
  transition?: string; // How to transition to next clip
}

/**
 * Video concept for content planning - now with multi-clip support
 */
export interface VideoConcept {
  title: string;
  hook: string;
  narrative: string;
  scenes: VideoScene[];
  visualStyle: string;
  audioDirection: string;
  callToAction: string;
  platform: SocialPlatform;
  duration: string;
  veoPrompt: string; // Legacy single prompt
  clips: VideoClip[]; // New: array of focused clip prompts
  totalDuration: number; // Total video duration in seconds
}

/**
 * Individual scene in a video concept
 */
export interface VideoScene {
  sceneNumber: number;
  timestamp: string;
  visual: string;
  action: string;
  text?: string;
  audio?: string;
}

/**
 * Result of generating a full multi-clip video
 */
export interface MultiClipVideoResult {
  concept: VideoConcept;
  clips: Array<{
    clipNumber: number;
    video: GeneratedVideo;
    filePath?: string;
  }>;
  outputDirectory?: string;
}

/**
 * Video Content Agent
 * Responsible for generating video prompts and actual videos via Google Veo 3
 */
export class VideoContentAgent extends BaseAgent {
  private genAI: GoogleGenAI | null = null;
  private videoModelName: string = 'veo-3.0-generate-001';
  private fastVideoModelName: string = 'veo-3.0-fast-generate-001';

  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Video Content Agent',
        description: 'Creates video concepts, prompts, and generates videos via Google Veo 3',
        systemPrompt: `You are an expert video content strategist and director for Apres Feels, a premium winter sports recovery and skincare brand.

## About Apres Feels
Apres Feels (apresfeels.com) is a premium and luxury skincare, muscle care, muscle recovery, and body recovery company for winter sports enthusiasts - skiers, snowboarders, mountaineers, and the après-ski lifestyle.

## Your Video Expertise
1. Creating detailed prompts for AI video generation optimized for Google Veo 3
2. Developing video concepts that capture mountain adventure and premium recovery
3. Understanding platform-specific video requirements (TikTok, Instagram Reels, etc.)
4. Crafting compelling narratives that blend action with self-care
5. Directing short-form content for social media engagement

## Video Style Principles for Apres Feels
- **Mountain Cinema**: Sweeping alpine vistas, dynamic ski/snowboard action, premium production value
- **Action to Recovery**: High-energy mountain footage transitioning to serene self-care moments
- **Premium Aesthetic**: Luxury lodge interiors, high-end product shots, sophisticated lighting
- **Après Lifestyle**: Social gatherings, fireside relaxation, post-adventure celebrations
- **Natural Elements**: Snow in motion, mountain weather, winter landscapes, natural ingredients
- **Color Grading**: Cool alpine blues, warm amber highlights, crisp winter whites

## Platform Video Requirements
- Instagram Reels: 9:16, 15-90 seconds, hook in first 3 seconds, trending audio friendly
- TikTok: 9:16, 15-60 seconds, authentic feel, trend-aware, text overlays
- Facebook: 16:9 or 1:1, 15-60 seconds, works with sound off, captions important
- Pinterest: 9:16 or 1:1, 15-60 seconds, inspirational, save-worthy

## Veo 3 Prompt Guidelines
When creating prompts for Veo 3:
- Be specific about camera movements (tracking shots, aerials, close-ups)
- Describe the winter sports action in detail
- Include lighting conditions (golden hour on slopes, lodge warmth, dramatic alpenglow)
- Specify the premium/luxury quality expected
- Reference product placement naturally
- Include audio direction (ambient mountain sounds, music style, voiceover tone)

## Video Types to Create
1. **Hero Videos**: Cinematic brand storytelling with mountain majesty
2. **Product Demos**: Premium product application and benefits
3. **Action Cuts**: Dynamic ski/snowboard footage with recovery transitions
4. **Lifestyle Vignettes**: Après-ski moments and mountain culture
5. **Educational**: Skincare tips and recovery routines for athletes
6. **Testimonials**: Athlete stories and recovery journeys
7. **Seasonal Campaigns**: Early season, peak winter, spring skiing vibes

Always create prompts that will generate cinematic, on-brand video content capturing the spirit of mountain adventure and premium self-care.`,
        temperature: 0.8,
      },
      brandConfig
    );

    // Initialize Gemini client if API key is available
    this.initializeGemini();
  }

  /**
   * Initialize the Gemini client for video generation
   * Supports both API key mode (for Imagen) and Vertex AI mode (for Veo)
   */
  private initializeGemini(): void {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    console.log('[VideoAgent] Config:', { projectId, location, hasApiKey: !!apiKey, credentialsPath });

    // Use Vertex AI mode for Veo video generation (requires GCP project + service account)
    // Vertex AI must be used for Veo - the Gemini API (v1beta) doesn't support video generation
    if (projectId && credentialsPath) {
      console.log(`[VideoAgent] Initializing with Vertex AI (project: ${projectId}, location: ${location})`);

      // Pass credentials via googleAuthOptions with keyFile and scopes
      this.genAI = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: location,
        googleAuthOptions: {
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        },
      });
    } else if (apiKey) {
      // API key mode - limited, may not support Veo
      console.log('[VideoAgent] Initializing with API key (WARNING: Veo may not work without Vertex AI)');
      this.genAI = new GoogleGenAI({ apiKey });
    } else {
      console.log('[VideoAgent] No credentials found - video generation unavailable');
    }
  }

  /**
   * Check if video generation is available
   */
  isVideoGenerationAvailable(): boolean {
    return this.genAI !== null;
  }

  /**
   * Generate a video using Google Veo 3
   */
  async generateVideo(
    prompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<AgentResponse<GeneratedVideo>> {
    if (!this.genAI) {
      return {
        success: false,
        error: 'Google AI not configured. Set GOOGLE_CLOUD_PROJECT for Vertex AI (recommended for Veo), or GEMINI_API_KEY for API key mode.',
      };
    }

    try {
      // Enhance prompt with brand context
      const enhancedPrompt = this.enhancePromptForBrand(prompt, options.style);
      const modelName = options.useFastModel ? this.fastVideoModelName : this.videoModelName;

      console.log(`Starting video generation with model: ${modelName}`);

      // Build config with all Veo 3.1 parameters
      const videoConfig: Record<string, unknown> = {
        durationSeconds: options.duration || 8,
        numberOfVideos: 1,
        includeAudio: options.withAudio !== false, // Audio enabled by default
      };

      // Add aspect ratio if specified
      if (options.aspectRatio) {
        videoConfig.aspectRatio = options.aspectRatio;
      }

      // Add resolution for Veo 3.1 (maps to API format)
      if (options.resolution) {
        const resolutionMap: Record<string, string> = {
          '720p': '720p',
          '1080p': '1080p',
          '4k': '4k',
        };
        videoConfig.resolution = resolutionMap[options.resolution];
      }

      // Add negative prompt if specified
      if (options.negativePrompt) {
        videoConfig.negativePrompt = options.negativePrompt;
      }

      // Add seed for reproducible results
      if (options.seed !== undefined) {
        videoConfig.seed = options.seed;
      }

      // Add person generation safety setting
      if (options.personGeneration) {
        videoConfig.personGeneration = options.personGeneration;
      }

      // Generate video using Veo 3 - returns a long-running operation
      let operation = await this.genAI.models.generateVideos({
        model: modelName,
        prompt: enhancedPrompt,
        config: videoConfig,
      });

      // Poll for the operation to complete
      let attempts = 0;
      let consecutiveErrors = 0;
      const maxAttempts = 180; // Wait up to 15 minutes (180 * 5s = 900s)
      const maxConsecutiveErrors = 5; // Fail after 5 consecutive poll errors
      const pollInterval = 5000; // 5 seconds

      while (!operation.done && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        attempts++;
        console.log(`Polling video generation... attempt ${attempts}/${maxAttempts}`);

        // Poll operation status using the operation name
        if (operation.name) {
          try {
            operation = await this.genAI.operations.getVideosOperation({ operation: operation });
            consecutiveErrors = 0; // Reset on success
          } catch (pollError) {
            consecutiveErrors++;
            const errorMessage = pollError instanceof Error ? pollError.message : String(pollError);
            console.warn(`Poll error (${consecutiveErrors}/${maxConsecutiveErrors}):`, errorMessage);

            if (consecutiveErrors >= maxConsecutiveErrors) {
              return {
                success: false,
                error: `Video generation polling failed after ${consecutiveErrors} consecutive errors: ${errorMessage}`,
              };
            }
          }
        }
      }

      if (!operation.done) {
        return { success: false, error: `Video generation timed out after ${maxAttempts * pollInterval / 1000} seconds` };
      }

      // Check for video in response
      const response = operation.response;
      if (!response?.generatedVideos || response.generatedVideos.length === 0) {
        return { success: false, error: 'No video generated in response' };
      }

      const generatedVideoResult = response.generatedVideos[0];

      const videoData: GeneratedVideo = {
        videoUrl: generatedVideoResult.video?.uri,
        videoData: generatedVideoResult.video?.videoBytes,
        mimeType: generatedVideoResult.video?.mimeType || 'video/mp4',
        prompt: enhancedPrompt,
        duration: options.duration || 8,
        resolution: options.resolution || '1080p',
        hasAudio: options.withAudio !== false,
      };

      // Save video if output directory specified
      if (options.outputDirectory) {
        const fileName = `apresfeels_video_${Date.now()}.mp4`;
        const filePath = path.join(options.outputDirectory, fileName);

        try {
          if (videoData.videoData) {
            // Save from base64 video bytes
            const buffer = Buffer.from(videoData.videoData, 'base64');
            validateBufferSize(buffer, MAX_VIDEO_SIZE, 'Video');
            fs.writeFileSync(filePath, buffer);
            videoData.filePath = filePath;
          } else if (videoData.videoUrl) {
            // Download from URL
            const videoResponse = await fetch(videoData.videoUrl);
            if (!videoResponse.ok) {
              throw new Error(
                `Video download failed with status ${videoResponse.status} ${videoResponse.statusText}`.trim()
              );
            }
            const buffer = Buffer.from(await videoResponse.arrayBuffer());
            validateBufferSize(buffer, MAX_VIDEO_SIZE, 'Video');
            fs.writeFileSync(filePath, buffer);
            videoData.filePath = filePath;
          } else {
            throw new Error('No downloadable video data returned by provider');
          }
        } catch (downloadError) {
          const errMsg = downloadError instanceof Error ? downloadError.message : String(downloadError);
          return { success: false, error: `Video generated but could not be saved locally: ${errMsg}` };
        }
      }

      return { success: true, data: videoData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating video';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate video and save to file
   */
  async generateAndSaveVideo(
    prompt: string,
    outputPath: string,
    options: VideoGenerationOptions = {}
  ): Promise<AgentResponse<{ filePath: string; prompt: string; videoUrl?: string }>> {
    const result = await this.generateVideo(prompt, {
      ...options,
      outputDirectory: path.dirname(outputPath),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        filePath: result.data.filePath || outputPath,
        prompt: result.data.prompt,
        videoUrl: result.data.videoUrl,
      },
    };
  }

  /**
   * Generate a complete video concept with multiple Veo clip prompts
   *
   * IMPORTANT: Veo can only generate 4-8 second clips. For longer videos,
   * we generate multiple focused clips that can be stitched together.
   */
  async generateVideoConcept(
    topic: string,
    platform: SocialPlatform,
    duration: '15s' | '30s' | '60s' = '30s',
    product?: Product
  ): Promise<AgentResponse<VideoConcept>> {
    // Calculate number of clips needed (each clip is 8 seconds max)
    const durationSeconds = { '15s': 15, '30s': 30, '60s': 60 }[duration];
    const numberOfClips = Math.ceil(durationSeconds / 8);

    const prompt = `Create a complete video concept for Apres Feels: "${topic}"

Platform: ${platform}
Target Duration: ${duration} (${durationSeconds} seconds total)
Number of clips to generate: ${numberOfClips} clips (each 6-8 seconds)
${product ? `Product to feature: ${product.name} - ${product.description}` : ''}

IMPORTANT: Google Veo generates 8-second clips maximum. You must break this video into ${numberOfClips} separate clips.

Remember: Apres Feels is a premium winter sports recovery brand. The video should capture:
- Mountain adventure and ski culture (skiing, snowboarding, mountaineering)
- Premium recovery and skincare moments
- The work hard/play hard lifestyle
- Après-ski social scenes and celebrations

## Veo Prompt Best Practices (FOLLOW THESE):
- Each clip prompt should be 1-2 sentences ONLY
- Focus on ONE scene/action per clip
- Be specific about: camera angle, lighting, subject action
- Include visual style keywords: cinematic, dramatic, golden hour, etc.
- Avoid complex multi-scene descriptions
- Good example: "Aerial tracking shot of a skier carving through fresh powder on a pristine alpine slope, golden morning light, snow crystals sparkling dramatically, cinematic quality"
- Bad example: "Skier goes down mountain then cuts to lodge then shows product" (too many scenes)

Output in JSON format:
\`\`\`json
{
  "title": "Brief concept title",
  "hook": "Opening hook description",
  "narrative": "Overall story arc blending action and recovery",
  "scenes": [
    {
      "sceneNumber": 1,
      "timestamp": "0:00-0:08",
      "visual": "Detailed visual description",
      "action": "What's happening",
      "text": "On-screen text if any",
      "audio": "Sound direction"
    }
  ],
  "visualStyle": "Overall visual style and color grading",
  "audioDirection": "Music and sound direction",
  "callToAction": "End CTA for Apres Feels",
  "platform": "${platform}",
  "duration": "${duration}",
  "totalDuration": ${durationSeconds},
  "clips": [
    {
      "clipNumber": 1,
      "duration": 8,
      "veoPrompt": "Focused 1-2 sentence Veo prompt for this specific clip. Be vivid and specific about ONE scene only.",
      "description": "What this clip shows in the overall video",
      "transition": "cut/fade/match cut to next clip"
    }
  ],
  "veoPrompt": "Legacy single prompt (for backwards compatibility)"
}
\`\`\`

Generate exactly ${numberOfClips} clips that together tell a cohesive story. Each clip should flow naturally to the next.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concept = this.parseJSON<VideoConcept>(response.data!);
    if (!concept) {
      return { success: false, error: 'Failed to parse video concept response' };
    }

    // Ensure clips array exists
    if (!concept.clips || concept.clips.length === 0) {
      // Fallback: create clips from the single veoPrompt
      concept.clips = [{
        clipNumber: 1,
        duration: 8,
        veoPrompt: concept.veoPrompt,
        description: concept.narrative,
      }];
    }

    concept.totalDuration = durationSeconds;

    return { success: true, data: concept, usage: response.usage };
  }

  /**
   * Generate a full multi-clip video from a concept
   * Generates all clips and saves them to the output directory
   */
  async generateFullVideo(
    concept: VideoConcept,
    options: VideoGenerationOptions & { outputDirectory: string }
  ): Promise<AgentResponse<MultiClipVideoResult>> {
    if (!concept.clips || concept.clips.length === 0) {
      return { success: false, error: 'No clips defined in video concept' };
    }

    const results: MultiClipVideoResult = {
      concept,
      clips: [],
      outputDirectory: options.outputDirectory,
    };

    console.log(`\nGenerating ${concept.clips.length} clips for "${concept.title}"...`);

    for (const clip of concept.clips) {
      console.log(`\n--- Generating Clip ${clip.clipNumber}/${concept.clips.length} ---`);
      console.log(`Prompt: ${clip.veoPrompt.substring(0, 100)}...`);

      const clipResult = await this.generateVideo(clip.veoPrompt, {
        ...options,
        duration: (clip.duration as 4 | 6 | 8) || 8,
      });

      if (!clipResult.success || !clipResult.data) {
        console.warn(`Failed to generate clip ${clip.clipNumber}: ${clipResult.error}`);
        continue;
      }

      // Save clip to file
      const fileName = `clip_${clip.clipNumber}_${Date.now()}.mp4`;
      const filePath = path.join(options.outputDirectory, fileName);

      try {
        if (!fs.existsSync(options.outputDirectory)) {
          fs.mkdirSync(options.outputDirectory, { recursive: true });
        }

        if (clipResult.data.videoData) {
          const buffer = Buffer.from(clipResult.data.videoData, 'base64');
          fs.writeFileSync(filePath, buffer);
          clipResult.data.filePath = filePath;
          console.log(`Saved clip ${clip.clipNumber} to: ${filePath}`);
        }
      } catch (err) {
        console.warn(`Failed to save clip ${clip.clipNumber}:`, err);
      }

      results.clips.push({
        clipNumber: clip.clipNumber,
        video: clipResult.data,
        filePath: clipResult.data.filePath,
      });
    }

    if (results.clips.length === 0) {
      return { success: false, error: 'Failed to generate any clips' };
    }

    console.log(`\n✅ Generated ${results.clips.length}/${concept.clips.length} clips`);
    console.log(`Clips saved to: ${options.outputDirectory}`);
    console.log(`\nTo create final video, combine clips in order using a video editor.`);

    return { success: true, data: results };
  }

  /**
   * Generate multiple video concepts for a campaign
   */
  async generateCampaignVideos(
    campaignTheme: string,
    platforms: SocialPlatform[],
    numberOfVideos: number = 5
  ): Promise<AgentResponse<VideoConcept[]>> {
    const prompt = `Create ${numberOfVideos} video concepts for an Apres Feels campaign themed: "${campaignTheme}"

Target platforms: ${platforms.join(', ')}

Remember: Apres Feels is a premium winter sports recovery brand. Videos should blend:
- Mountain adventure and ski culture
- Premium skincare and muscle recovery
- The work hard/play hard lifestyle
- Après-ski social scenes

Output in JSON format:
\`\`\`json
[
  {
    "title": "Video concept title",
    "hook": "Opening hook for engagement",
    "narrative": "Story arc for the video",
    "scenes": [
      {
        "sceneNumber": 1,
        "timestamp": "0:00-0:03",
        "visual": "Visual description with camera movement",
        "action": "Scene action",
        "text": "On-screen text",
        "audio": "Audio direction"
      }
    ],
    "visualStyle": "Visual style direction",
    "audioDirection": "Audio/music direction for Veo 3",
    "callToAction": "End CTA",
    "platform": "instagram",
    "duration": "30s",
    "veoPrompt": "Complete Veo 3 prompt - be vivid, specific, and include camera movements, lighting, action, and premium aesthetic"
  }
]
\`\`\`

Create variety in video styles while maintaining the Apres Feels premium mountain lifestyle brand.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concepts = this.parseJSON<VideoConcept[]>(response.data!);
    if (!concepts) {
      return { success: false, error: 'Failed to parse campaign videos response' };
    }

    return { success: true, data: concepts, usage: response.usage };
  }

  /**
   * Generate a product video concept
   */
  async generateProductVideo(
    product: Product,
    style: 'hero' | 'demo' | 'lifestyle' | 'action-recovery' | 'testimonial',
    platform: SocialPlatform = 'instagram'
  ): Promise<AgentResponse<VideoConcept>> {
    const styleDescriptions: Record<string, string> = {
      hero: 'Cinematic brand hero video showcasing product in mountain majesty',
      demo: 'Product demonstration showing application and benefits',
      lifestyle: 'Lifestyle vignette featuring product in après-ski setting',
      'action-recovery': 'Dynamic action footage transitioning to recovery with product',
      testimonial: 'Athlete story featuring product in their recovery routine',
    };

    const prompt = `Create a ${style} video concept for Apres Feels product:

Product: ${product.name}
Description: ${product.description}
Key Ingredients: ${product.keyIngredients.join(', ')}
Benefits: ${product.benefits.join(', ')}
Category: ${product.category}

Style: ${styleDescriptions[style]}
Platform: ${platform}

Output in JSON format:
\`\`\`json
{
  "title": "Video concept title featuring ${product.name}",
  "hook": "Opening hook that grabs attention",
  "narrative": "Story arc showcasing the product",
  "scenes": [
    {
      "sceneNumber": 1,
      "timestamp": "0:00-0:03",
      "visual": "Visual with camera movement and product placement",
      "action": "Scene action",
      "text": "On-screen text",
      "audio": "Audio direction"
    }
  ],
  "visualStyle": "Visual style emphasizing premium quality",
  "audioDirection": "Audio direction for Veo 3's native audio generation",
  "callToAction": "CTA driving to purchase or learn more",
  "platform": "${platform}",
  "duration": "30s",
  "veoPrompt": "Complete Veo 3 prompt showcasing ${product.name}. Include: cinematic camera work, premium alpine setting, product hero moments, luxury lighting, and mountain lifestyle context. Be extremely specific and vivid."
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concept = this.parseJSON<VideoConcept>(response.data!);
    if (!concept) {
      return { success: false, error: 'Failed to parse product video response' };
    }

    return { success: true, data: concept, usage: response.usage };
  }

  /**
   * Generate a seasonal video campaign
   */
  async generateSeasonalVideoCampaign(
    season: 'early-season' | 'peak-season' | 'spring-skiing' | 'off-season'
  ): Promise<
    AgentResponse<{
      campaignName: string;
      theme: string;
      videos: VideoConcept[];
      releaseSchedule: Array<{
        week: number;
        video: string;
        platform: SocialPlatform;
      }>;
    }>
  > {
    const seasonContexts: Record<string, string> = {
      'early-season': 'First chair excitement, fresh snow anticipation, gearing up for the season',
      'peak-season': 'Powder days, epic conditions, peak adventure and recovery needs',
      'spring-skiing': 'Warm sun, corn snow, deck parties, lighter vibe and celebration',
      'off-season': 'Training, preparation, mountain longing, maintaining recovery routines',
    };

    const prompt = `Create a ${season} video campaign for Apres Feels.

Season Context: ${seasonContexts[season]}

Output in JSON format:
\`\`\`json
{
  "campaignName": "Creative campaign name",
  "theme": "Overall campaign theme and visual direction",
  "videos": [
    {
      "title": "Video title",
      "hook": "Opening hook",
      "narrative": "Story arc",
      "scenes": [
        {
          "sceneNumber": 1,
          "timestamp": "0:00-0:03",
          "visual": "Visual description",
          "action": "Action",
          "text": "On-screen text",
          "audio": "Audio direction"
        }
      ],
      "visualStyle": "Visual style",
      "audioDirection": "Audio direction",
      "callToAction": "CTA",
      "platform": "instagram",
      "duration": "30s",
      "veoPrompt": "Complete Veo 3 prompt - vivid, specific, cinematic"
    }
  ],
  "releaseSchedule": [
    {
      "week": 1,
      "video": "Video title",
      "platform": "instagram"
    }
  ]
}
\`\`\`

Create 4-6 videos that tell a cohesive seasonal story for Apres Feels.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const campaign = this.parseJSON<{
      campaignName: string;
      theme: string;
      videos: VideoConcept[];
      releaseSchedule: Array<{
        week: number;
        video: string;
        platform: SocialPlatform;
      }>;
    }>(response.data!);

    if (!campaign) {
      return { success: false, error: 'Failed to parse seasonal video campaign response' };
    }

    return { success: true, data: campaign, usage: response.usage };
  }

  /**
   * Generate a Veo 3 optimized prompt from a concept
   */
  async generateVeoPrompt(
    concept: string,
    style: VideoGenerationOptions['style'] = 'cinematic',
    aspectRatio: VideoGenerationOptions['aspectRatio'] = '9:16'
  ): Promise<AgentResponse<{ prompt: string; negativePrompt: string; audioDirection: string }>> {
    const prompt = `Create an optimized Google Veo 3 video generation prompt for: "${concept}"

Style: ${style}
Aspect Ratio: ${aspectRatio}
Brand: Apres Feels - premium winter sports recovery

Remember Veo 3 generates 8-second videos with native audio. The prompt should:
- Be 2-4 sentences describing the complete video
- Include specific camera movements (tracking shot, aerial, close-up, dolly)
- Describe lighting (alpine golden hour, lodge warmth, dramatic shadows)
- Detail the action and movement (skiing dynamics, product application, social moments)
- Specify the premium/luxury aesthetic
- Include audio direction since Veo 3 generates audio

Output in JSON format:
\`\`\`json
{
  "prompt": "Complete Veo 3 prompt - vivid, specific, 2-4 sentences covering visuals, camera, lighting, action, and atmosphere",
  "negativePrompt": "Elements to avoid in the video",
  "audioDirection": "Specific audio direction for Veo 3's native audio generation (music style, ambient sounds, etc.)"
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const result = this.parseJSON<{
      prompt: string;
      negativePrompt: string;
      audioDirection: string;
    }>(response.data!);

    if (!result) {
      return { success: false, error: 'Failed to parse Veo prompt response' };
    }

    return { success: true, data: result, usage: response.usage };
  }

  /**
   * Generate video from concept (combines concept generation with actual video generation)
   */
  async generateVideoFromConcept(
    topic: string,
    platform: SocialPlatform,
    options: VideoGenerationOptions = {}
  ): Promise<AgentResponse<{ concept: VideoConcept; video?: GeneratedVideo }>> {
    // First generate the concept
    const conceptResult = await this.generateVideoConcept(topic, platform);
    if (!conceptResult.success || !conceptResult.data) {
      return { success: false, error: conceptResult.error };
    }

    const concept = conceptResult.data;

    // Then generate the actual video using the Veo prompt
    const videoResult = await this.generateVideo(concept.veoPrompt, options);

    return {
      success: true,
      data: {
        concept,
        video: videoResult.success ? videoResult.data : undefined,
      },
    };
  }

  /**
   * Enhance a prompt with Apres Feels brand context for video
   */
  private enhancePromptForBrand(prompt: string, style?: string): string {
    const brandContext = `Premium winter sports and mountain lifestyle brand video for Apres Feels. `;
    const qualityModifiers = `Cinematic quality, professional color grading, smooth camera movements, luxury premium feel. `;
    const styleModifier = style ? `Style: ${style}. ` : 'Style: cinematic lifestyle. ';
    const colorContext = `Color palette: cool alpine blues, crisp snow whites, warm amber lodge accents, golden hour mountain light. `;
    const audioContext = `Audio: ambient mountain atmosphere, premium feel, matching the visual energy. `;

    return `${brandContext}${styleModifier}${colorContext}${qualityModifiers}${audioContext}${prompt}`;
  }

  /**
   * Generate a trend-based video concept
   */
  async generateTrendVideo(
    trendDescription: string,
    platform: 'tiktok' | 'instagram' = 'tiktok'
  ): Promise<AgentResponse<VideoConcept>> {
    const prompt = `Adapt this trend for Apres Feels: "${trendDescription}"

Platform: ${platform}
Brand: Apres Feels - premium winter sports recovery and skincare

Create a video concept that:
- Authentically participates in the trend
- Incorporates mountain/ski culture and lifestyle
- Features product naturally without being overly promotional
- Maintains the premium aesthetic while being relatable

Output in JSON format:
\`\`\`json
{
  "title": "Trend adaptation title",
  "hook": "Opening hook matching trend format",
  "narrative": "How we're adapting the trend for Apres Feels",
  "scenes": [
    {
      "sceneNumber": 1,
      "timestamp": "0:00-0:03",
      "visual": "Visual following trend format with Apres Feels twist",
      "action": "Action",
      "text": "Text overlay if relevant to trend",
      "audio": "Audio direction (original sound or trend audio style)"
    }
  ],
  "visualStyle": "Style matching trend while maintaining brand",
  "audioDirection": "Audio direction - trending sound style or original",
  "callToAction": "Subtle CTA appropriate for trend content",
  "platform": "${platform}",
  "duration": "15s",
  "veoPrompt": "Veo 3 prompt for this trend video - capture the trend format while showcasing Apres Feels lifestyle"
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concept = this.parseJSON<VideoConcept>(response.data!);
    if (!concept) {
      return { success: false, error: 'Failed to parse trend video response' };
    }

    return { success: true, data: concept, usage: response.usage };
  }
}
