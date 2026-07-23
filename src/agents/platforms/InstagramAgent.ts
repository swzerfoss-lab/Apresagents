import { BasePlatformAgent, PlatformSpecs } from './BasePlatformAgent.js';
import type { BrandConfig, Product, AgentResponse } from '../../types/index.js';

const instagramSpecs: PlatformSpecs = {
  platform: 'instagram',
  maxCaptionLength: 2200,
  maxHashtags: 30,
  supportedContentTypes: ['post', 'story', 'reel', 'carousel'],
  optimalPostTimes: ['6-9 AM', '12-2 PM', '5-7 PM'],
  aspectRatios: {
    post: '1:1 or 4:5',
    story: '9:16',
    reel: '9:16',
    carousel: '1:1 or 4:5',
    video: '9:16',
    pin: '2:3',
    ad: '1:1',
  },
  bestPractices: [
    'Front-load important information in captions (first 125 chars visible)',
    'Use a mix of hashtag sizes (big, medium, niche)',
    'Post Reels consistently for algorithm favor',
    'Use Stories for daily engagement and behind-the-scenes',
    'Carousel posts get highest save rates - use for educational content',
    'Respond to comments quickly to boost engagement',
    'Use Instagram-native features (polls, questions, countdowns)',
  ],
};

/**
 * Instagram-specialized agent
 */
export class InstagramAgent extends BasePlatformAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      brandConfig,
      instagramSpecs,
      `## Instagram-Specific Expertise
You understand:
- The importance of aesthetic cohesion in the grid
- How Reels algorithm prioritizes watch time and shares
- Story engagement tactics (polls, questions, sliders)
- Carousel optimization for saves and shares
- Shopping tag and product tagging best practices
- Collaboration and remix features
- SEO in captions and alt text`
    );
  }

  /**
   * Generate Instagram Reel concept
   */
  async generateReelConcept(
    topic: string,
    product?: Product
  ): Promise<
    AgentResponse<{
      hook: string;
      script: string;
      scenes: Array<{ timestamp: string; visual: string; text: string }>;
      audio: string;
      hashtags: string[];
      caption: string;
    }>
  > {
    const prompt = `Create an Instagram Reel concept for: "${topic}"
${product ? `\nFeatured Product: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "hook": "First 1-2 seconds hook to stop the scroll",
  "script": "Full voiceover/text script if applicable",
  "scenes": [
    {
      "timestamp": "0:00-0:03",
      "visual": "What's shown on screen",
      "text": "On-screen text overlay"
    }
  ],
  "audio": "Trending audio suggestion or original audio description",
  "hashtags": ["relevant", "hashtags"],
  "caption": "Engaging caption optimized for Reels"
}
\`\`\`

Optimize for watch time, shares, and saves. Make the hook irresistible.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const concept = this.parseJSON<{
      hook: string;
      script: string;
      scenes: Array<{ timestamp: string; visual: string; text: string }>;
      audio: string;
      hashtags: string[];
      caption: string;
    }>(response.data!);

    if (!concept) {
      return { success: false, error: 'Failed to parse Reel concept response' };
    }

    return { success: true, data: concept, usage: response.usage };
  }

  /**
   * Generate Instagram Story sequence
   */
  async generateStorySequence(
    topic: string,
    numberOfStories: number = 5
  ): Promise<
    AgentResponse<{
      theme: string;
      stories: Array<{
        type: 'image' | 'video' | 'text' | 'poll' | 'question' | 'quiz';
        content: string;
        visualDescription: string;
        interactiveElement?: string;
        callToAction?: string;
      }>;
    }>
  > {
    const prompt = `Create a ${numberOfStories}-story Instagram Story sequence about: "${topic}"

Output in JSON format:
\`\`\`json
{
  "theme": "Overall story sequence theme",
  "stories": [
    {
      "type": "image|video|text|poll|question|quiz",
      "content": "The main content/text for this story",
      "visualDescription": "What the visual should show",
      "interactiveElement": "Poll question, quiz options, etc. if applicable",
      "callToAction": "What you want viewers to do"
    }
  ]
}
\`\`\`

Use interactive elements strategically to boost engagement. Create a narrative flow.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const sequence = this.parseJSON<{
      theme: string;
      stories: Array<{
        type: 'image' | 'video' | 'text' | 'poll' | 'question' | 'quiz';
        content: string;
        visualDescription: string;
        interactiveElement?: string;
        callToAction?: string;
      }>;
    }>(response.data!);

    if (!sequence) {
      return { success: false, error: 'Failed to parse Story sequence response' };
    }

    return { success: true, data: sequence, usage: response.usage };
  }

  /**
   * Generate grid-cohesive post series
   */
  async generateGridSeries(
    theme: string,
    numberOfPosts: number = 9
  ): Promise<
    AgentResponse<{
      gridTheme: string;
      colorPalette: string[];
      posts: Array<{
        position: number;
        concept: string;
        visualStyle: string;
        caption: string;
        hashtags: string[];
      }>;
      gridLayoutNotes: string;
    }>
  > {
    const prompt = `Create a ${numberOfPosts}-post Instagram grid series for theme: "${theme}"

Consider grid aesthetics and how posts will look together.

Output in JSON format:
\`\`\`json
{
  "gridTheme": "Visual theme tying the grid together",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "posts": [
    {
      "position": 1,
      "concept": "Post concept",
      "visualStyle": "Visual approach for this post",
      "caption": "Full caption",
      "hashtags": ["hashtags"]
    }
  ],
  "gridLayoutNotes": "How the posts should be arranged for visual impact"
}
\`\`\`

Ensure visual cohesion while maintaining individual post value.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const series = this.parseJSON<{
      gridTheme: string;
      colorPalette: string[];
      posts: Array<{
        position: number;
        concept: string;
        visualStyle: string;
        caption: string;
        hashtags: string[];
      }>;
      gridLayoutNotes: string;
    }>(response.data!);

    if (!series) {
      return { success: false, error: 'Failed to parse grid series response' };
    }

    return { success: true, data: series, usage: response.usage };
  }
}
