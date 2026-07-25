import { BaseAgent } from './BaseAgent.js';
import type {
  BrandConfig,
  Product,
  SocialPlatform,
  AgentResponse,
} from '../types/index.js';

/**
 * Copywriting Agent
 * Responsible for writing captions, ad copy, hashtags, and all text content
 */
export class CopywritingAgent extends BaseAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Copywriting Agent',
        description: 'Creates compelling captions, ad copy, hashtags, and text content',
        systemPrompt: `You are an expert social media copywriter specializing in skincare and beauty brands. Your writing style is:

- Engaging and conversational while maintaining professionalism
- Benefits-focused, emphasizing how products improve the customer's life
- Emotionally resonant, connecting skincare to self-care and confidence
- Educational when discussing ingredients or routines
- Inclusive and body-positive

Writing Guidelines:
1. Hook readers in the first line - this is crucial for social media
2. Use power words that evoke emotion and action
3. Include clear calls-to-action
4. Keep language accessible - avoid overly technical jargon
5. Create FOMO and urgency when appropriate (without being pushy)
6. Use storytelling to make content relatable
7. Vary sentence length for rhythm and readability

Platform-specific considerations:
- Instagram: Emotional, aesthetic-focused, up to 2200 chars but front-load key info
- TikTok: Casual, trendy, hook-focused, use trending phrases
- Facebook: Conversational, community-focused, can be longer-form
- Pinterest: Search-optimized, descriptive, solution-focused

Always output in JSON format when generating structured content.`,
        temperature: 0.8,
      },
      brandConfig
    );
  }

  /**
   * Generate a complete social media caption
   */
  async generateCaption(
    platform: SocialPlatform,
    topic: string,
    product?: Product,
    additionalContext?: string
  ): Promise<AgentResponse<{ caption: string; hashtags: string[]; callToAction: string }>> {
    const prompt = `Create a ${platform} caption for: "${topic}"
${product ? `\nFeatured Product: ${product.name}\nDescription: ${product.description}\nKey Ingredients: ${product.keyIngredients.join(', ')}\nBenefits: ${product.benefits.join(', ')}` : ''}
${additionalContext ? `\nAdditional Context: ${additionalContext}` : ''}

Output in JSON format:
\`\`\`json
{
  "caption": "The full caption text with emojis where appropriate",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "callToAction": "The specific CTA used"
}
\`\`\`

Make the caption ${platform === 'tiktok' ? 'short, punchy, and trend-aware' : platform === 'instagram' ? 'engaging with a strong hook' : platform === 'pinterest' ? 'SEO-optimized and descriptive' : 'conversational and community-focused'}.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const data = this.parseJSON<{ caption: string; hashtags: string[]; callToAction: string }>(
      response.data!
    );
    if (!data) {
      return { success: false, error: 'Failed to parse caption response' };
    }

    return { success: true, data, usage: response.usage };
  }

  /**
   * Generate multiple caption variations
   */
  async generateCaptionVariations(
    platform: SocialPlatform,
    topic: string,
    count: number = 3
  ): Promise<AgentResponse<string[]>> {
    const prompt = `Create ${count} different caption variations for ${platform} about: "${topic}"

Each variation should have a different:
1. Hook/opening line approach
2. Tone (playful vs informative vs inspiring)
3. Call-to-action

Output as a JSON array:
\`\`\`json
["caption 1", "caption 2", "caption 3"]
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const captions = this.parseJSON<string[]>(response.data!);
    if (!captions) {
      return { success: false, error: 'Failed to parse captions response' };
    }

    return { success: true, data: captions, usage: response.usage };
  }

  /**
   * Generate hashtag sets
   */
  async generateHashtags(
    topic: string,
    platform: SocialPlatform,
    count: number = 15
  ): Promise<AgentResponse<{ primary: string[]; secondary: string[]; branded: string[] }>> {
    const prompt = `Generate ${count} hashtags for a ${platform} post about: "${topic}"

Categorize them into:
1. **Primary** (high-volume, competitive): 5 hashtags
2. **Secondary** (medium-volume, niche): ${Math.floor(count * 0.5)} hashtags
3. **Branded** (brand-specific): 3 hashtags

Output in JSON format:
\`\`\`json
{
  "primary": ["hashtag1", "hashtag2", ...],
  "secondary": ["hashtag1", "hashtag2", ...],
  "branded": ["hashtag1", "hashtag2", ...]
}
\`\`\`

Do not include the # symbol in the hashtags.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const hashtags = this.parseJSON<{
      primary: string[];
      secondary: string[];
      branded: string[];
    }>(response.data!);
    if (!hashtags) {
      return { success: false, error: 'Failed to parse hashtags response' };
    }

    return { success: true, data: hashtags, usage: response.usage };
  }

  /**
   * Generate ad copy
   */
  async generateAdCopy(
    product: Product,
    platform: SocialPlatform,
    objective: 'awareness' | 'consideration' | 'conversion'
  ): Promise<
    AgentResponse<{
      headline: string;
      primaryText: string;
      description?: string;
      callToAction: string;
    }>
  > {
    const prompt = `Create ad copy for ${platform} with a ${objective} objective.

Product: ${product.name}
Description: ${product.description}
Key Ingredients: ${product.keyIngredients.join(', ')}
Benefits: ${product.benefits.join(', ')}
Price: $${product.price}

Output in JSON format:
\`\`\`json
{
  "headline": "Short, attention-grabbing headline (max 40 chars)",
  "primaryText": "Main ad copy that drives action",
  "description": "Optional secondary text for platforms that support it",
  "callToAction": "The CTA button text recommendation"
}
\`\`\`

Focus on ${objective === 'awareness' ? 'introducing the brand and creating interest' : objective === 'consideration' ? 'highlighting benefits and building desire' : 'driving immediate purchase with urgency'}.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const adCopy = this.parseJSON<{
      headline: string;
      primaryText: string;
      description?: string;
      callToAction: string;
    }>(response.data!);
    if (!adCopy) {
      return { success: false, error: 'Failed to parse ad copy response' };
    }

    return { success: true, data: adCopy, usage: response.usage };
  }

  /**
   * Generate product description
   */
  async generateProductDescription(
    product: Product,
    style: 'short' | 'detailed' | 'storytelling'
  ): Promise<AgentResponse<string>> {
    const prompt = `Write a ${style} product description for:

Product: ${product.name}
Current Description: ${product.description}
Key Ingredients: ${product.keyIngredients.join(', ')}
Benefits: ${product.benefits.join(', ')}
Category: ${product.category}

${style === 'short' ? 'Keep it under 100 words, punchy and benefit-focused.' : style === 'detailed' ? 'Write 200-300 words covering ingredients, benefits, and usage.' : 'Write a compelling narrative (150-200 words) that connects emotionally with the reader.'}`;

    return this.singleQuery(prompt);
  }

  /**
   * Generate hooks/opening lines
   */
  async generateHooks(topic: string, count: number = 5): Promise<AgentResponse<string[]>> {
    const prompt = `Generate ${count} scroll-stopping hooks/opening lines for social media content about: "${topic}"

Requirements:
- Each hook should use a different technique (question, statistic, bold claim, relatable statement, etc.)
- Should make people stop scrolling and want to read more
- Appropriate for skincare/beauty content

Output as a JSON array:
\`\`\`json
["hook 1", "hook 2", ...]
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const hooks = this.parseJSON<string[]>(response.data!);
    if (!hooks) {
      return { success: false, error: 'Failed to parse hooks response' };
    }

    return { success: true, data: hooks, usage: response.usage };
  }

  /**
   * Rewrite content for a different platform
   */
  async adaptForPlatform(
    originalContent: string,
    fromPlatform: SocialPlatform,
    toPlatform: SocialPlatform
  ): Promise<AgentResponse<string>> {
    const prompt = `Adapt this ${fromPlatform} content for ${toPlatform}:

Original Content:
"${originalContent}"

Consider ${toPlatform}'s:
- Character limits and best practices
- Audience expectations and tone
- Content format preferences
- Hashtag usage norms

Rewrite the content to feel native to ${toPlatform}.`;

    return this.singleQuery(prompt);
  }
}
