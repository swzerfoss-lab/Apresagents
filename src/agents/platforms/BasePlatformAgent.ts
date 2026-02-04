import { BaseAgent } from '../BaseAgent.js';
import type {
  BrandConfig,
  SocialPlatform,
  ContentType,
  Product,
  AgentResponse,
  GeneratedContent,
  ContentMetadata,
} from '../../types/index.js';

/**
 * Platform-specific constraints and best practices
 */
export interface PlatformSpecs {
  platform: SocialPlatform;
  maxCaptionLength: number;
  maxHashtags: number;
  supportedContentTypes: ContentType[];
  optimalPostTimes: string[];
  aspectRatios: Record<ContentType, string>;
  bestPractices: string[];
}

/**
 * Base Platform Agent that platform-specific agents extend
 */
export abstract class BasePlatformAgent extends BaseAgent {
  protected platformSpecs: PlatformSpecs;

  constructor(brandConfig: BrandConfig, platformSpecs: PlatformSpecs, systemPromptAddition: string) {
    super(
      {
        name: `${platformSpecs.platform.charAt(0).toUpperCase() + platformSpecs.platform.slice(1)} Agent`,
        description: `Specializes in ${platformSpecs.platform} content creation and optimization`,
        systemPrompt: `You are an expert ${platformSpecs.platform} content creator and strategist for skincare brands.

## Platform Specifications
- Maximum Caption Length: ${platformSpecs.maxCaptionLength} characters
- Maximum Hashtags: ${platformSpecs.maxHashtags}
- Supported Content Types: ${platformSpecs.supportedContentTypes.join(', ')}
- Optimal Post Times: ${platformSpecs.optimalPostTimes.join(', ')}

## Best Practices
${platformSpecs.bestPractices.map((bp, i) => `${i + 1}. ${bp}`).join('\n')}

${systemPromptAddition}

Always optimize content specifically for ${platformSpecs.platform}'s algorithm, audience behavior, and format requirements.`,
        temperature: 0.7,
      },
      brandConfig
    );
    this.platformSpecs = platformSpecs;
  }

  /**
   * Generate platform-optimized content
   */
  async generateContent(
    topic: string,
    contentType: ContentType,
    product?: Product
  ): Promise<AgentResponse<GeneratedContent>> {
    if (!this.platformSpecs.supportedContentTypes.includes(contentType)) {
      return {
        success: false,
        error: `Content type '${contentType}' is not supported on ${this.platformSpecs.platform}`,
      };
    }

    const prompt = `Create a ${contentType} for ${this.platformSpecs.platform} about: "${topic}"
${product ? `\nFeatured Product: ${product.name}\nDescription: ${product.description}\nBenefits: ${product.benefits.join(', ')}` : ''}

Requirements:
- Caption must be under ${this.platformSpecs.maxCaptionLength} characters
- Include up to ${this.platformSpecs.maxHashtags} relevant hashtags
- Optimize for ${this.platformSpecs.platform}'s algorithm

Output in JSON format:
\`\`\`json
{
  "caption": "Platform-optimized caption",
  "hashtags": ["hashtag1", "hashtag2"],
  "callToAction": "Specific CTA",
  "visualDescription": "What the visual content should show",
  "visualPrompt": "Detailed AI image generation prompt",
  "suggestedPostTime": "Optimal time to post",
  "alternativeVersions": ["Alternative caption 1", "Alternative caption 2"]
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const data = this.parseJSON<Omit<GeneratedContent, 'id' | 'platform' | 'contentType' | 'category' | 'metadata'>>(
      response.data!
    );

    if (!data) {
      return { success: false, error: 'Failed to parse content response' };
    }

    const content: GeneratedContent = {
      id: `content-${Date.now()}`,
      platform: this.platformSpecs.platform,
      contentType,
      category: 'product-highlight',
      ...data,
      metadata: {
        createdAt: new Date(),
        agentUsed: this.getName(),
      },
    };

    return { success: true, data: content, usage: response.usage };
  }

  /**
   * Optimize existing content for this platform
   */
  async optimizeContent(
    originalContent: string,
    originalPlatform?: SocialPlatform
  ): Promise<AgentResponse<string>> {
    const prompt = `Optimize this content for ${this.platformSpecs.platform}:

Original Content${originalPlatform ? ` (from ${originalPlatform})` : ''}:
"${originalContent}"

Requirements:
- Must be under ${this.platformSpecs.maxCaptionLength} characters
- Optimize for ${this.platformSpecs.platform}'s audience and algorithm
- Maintain the core message while adapting tone and format

Provide the optimized content.`;

    return this.singleQuery(prompt);
  }

  /**
   * Get platform-specific recommendations
   */
  async getRecommendations(contentType: ContentType): Promise<AgentResponse<string>> {
    const prompt = `Provide specific recommendations for creating a high-performing ${contentType} on ${this.platformSpecs.platform} for a skincare brand.

Cover:
1. Content structure and format
2. Visual requirements and specs
3. Caption writing tips
4. Hashtag strategy
5. Best times to post
6. Algorithm optimization tips
7. Engagement tactics`;

    return this.singleQuery(prompt);
  }

  /**
   * Get platform specs
   */
  getSpecs(): PlatformSpecs {
    return this.platformSpecs;
  }
}
