import { BasePlatformAgent, PlatformSpecs } from './BasePlatformAgent.js';
import type { BrandConfig, Product, AgentResponse } from '../../types/index.js';

const facebookSpecs: PlatformSpecs = {
  platform: 'facebook',
  maxCaptionLength: 63206,
  maxHashtags: 10,
  supportedContentTypes: ['post', 'story', 'video', 'carousel', 'reel'],
  optimalPostTimes: ['9-10 AM', '12-1 PM', '4-5 PM'],
  aspectRatios: {
    post: '1.91:1 or 1:1',
    story: '9:16',
    reel: '9:16',
    carousel: '1:1',
    video: '16:9 or 1:1',
    pin: '2:3',
    ad: '1.91:1',
  },
  bestPractices: [
    'Focus on community building and conversation',
    'Native video performs better than links to YouTube',
    'Ask questions to drive comments',
    'Use Facebook Groups for engaged communities',
    'Share user-generated content and testimonials',
    'Post less frequently but with higher quality',
    'Use Facebook Live for real-time engagement',
    'Optimize for shares - shareable content reaches more people',
  ],
};

/**
 * Facebook-specialized agent
 */
export class FacebookAgent extends BasePlatformAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      brandConfig,
      facebookSpecs,
      `## Facebook-Specific Expertise
You understand:
- Facebook's older, more diverse demographic
- The importance of community and groups
- How to drive meaningful conversations
- Facebook Shop and commerce features
- Event and promotion features
- Facebook Live best practices
- Cross-posting from Instagram considerations
- Facebook advertising ecosystem`
    );
  }

  /**
   * Generate community-focused post
   */
  async generateCommunityPost(
    topic: string,
    style: 'discussion' | 'poll' | 'story' | 'tip' | 'celebration'
  ): Promise<
    AgentResponse<{
      post: string;
      engagementQuestion: string;
      visualSuggestion: string;
      hashtags: string[];
      bestTimeToPost: string;
    }>
  > {
    const prompt = `Create a ${style} Facebook post for: "${topic}"

Output in JSON format:
\`\`\`json
{
  "post": "Full post text optimized for Facebook's conversational tone",
  "engagementQuestion": "A question to drive comments",
  "visualSuggestion": "What type of image/video to pair with this",
  "hashtags": ["relevant", "hashtags"],
  "bestTimeToPost": "Recommended posting time"
}
\`\`\`

Focus on creating conversation and community connection.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const postData = this.parseJSON<{
      post: string;
      engagementQuestion: string;
      visualSuggestion: string;
      hashtags: string[];
      bestTimeToPost: string;
    }>(response.data!);

    if (!postData) {
      return { success: false, error: 'Failed to parse community post response' };
    }

    return { success: true, data: postData, usage: response.usage };
  }

  /**
   * Generate Facebook Group content strategy
   */
  async generateGroupStrategy(
    groupPurpose: string
  ): Promise<
    AgentResponse<{
      groupName: string;
      description: string;
      rules: string[];
      contentPillars: Array<{
        pillar: string;
        frequency: string;
        examplePosts: string[];
      }>;
      engagementTactics: string[];
      weeklySchedule: Record<string, string>;
    }>
  > {
    const prompt = `Create a Facebook Group strategy for: "${groupPurpose}"

Output in JSON format:
\`\`\`json
{
  "groupName": "Suggested group name",
  "description": "Group description",
  "rules": ["Rule 1", "Rule 2"],
  "contentPillars": [
    {
      "pillar": "Pillar name",
      "frequency": "How often",
      "examplePosts": ["Example 1", "Example 2"]
    }
  ],
  "engagementTactics": ["Tactic 1", "Tactic 2"],
  "weeklySchedule": {
    "Monday": "Theme/activity",
    "Tuesday": "Theme/activity"
  }
}
\`\`\`

Focus on building a genuine community around skincare.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const strategy = this.parseJSON<{
      groupName: string;
      description: string;
      rules: string[];
      contentPillars: Array<{
        pillar: string;
        frequency: string;
        examplePosts: string[];
      }>;
      engagementTactics: string[];
      weeklySchedule: Record<string, string>;
    }>(response.data!);

    if (!strategy) {
      return { success: false, error: 'Failed to parse group strategy response' };
    }

    return { success: true, data: strategy, usage: response.usage };
  }

  /**
   * Generate Facebook Live concept
   */
  async generateLiveConcept(
    topic: string,
    duration: '15min' | '30min' | '60min' = '30min',
    product?: Product
  ): Promise<
    AgentResponse<{
      title: string;
      description: string;
      outline: Array<{
        timestamp: string;
        segment: string;
        content: string;
        engagement: string;
      }>;
      preparation: string[];
      promotionPosts: string[];
      callToAction: string;
    }>
  > {
    const prompt = `Create a ${duration} Facebook Live concept for: "${topic}"
${product ? `\nFeatured Product: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "title": "Live stream title",
  "description": "Event description",
  "outline": [
    {
      "timestamp": "0:00-5:00",
      "segment": "Segment name",
      "content": "What's covered",
      "engagement": "How to engage viewers during this segment"
    }
  ],
  "preparation": ["Things to prepare before going live"],
  "promotionPosts": ["Pre-promotion post 1", "Pre-promotion post 2"],
  "callToAction": "Main CTA for the live"
}
\`\`\`

Plan for viewer interaction throughout.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const liveConcept = this.parseJSON<{
      title: string;
      description: string;
      outline: Array<{
        timestamp: string;
        segment: string;
        content: string;
        engagement: string;
      }>;
      preparation: string[];
      promotionPosts: string[];
      callToAction: string;
    }>(response.data!);

    if (!liveConcept) {
      return { success: false, error: 'Failed to parse Live concept response' };
    }

    return { success: true, data: liveConcept, usage: response.usage };
  }

  /**
   * Generate shareable content
   */
  async generateShareableContent(
    type: 'infographic' | 'quote' | 'tip' | 'meme' | 'challenge'
  ): Promise<
    AgentResponse<{
      concept: string;
      text: string;
      visualDescription: string;
      shareabilityFactor: string;
      caption: string;
    }>
  > {
    const prompt = `Create highly shareable Facebook ${type} content for our skincare brand.

Output in JSON format:
\`\`\`json
{
  "concept": "Brief concept description",
  "text": "The main text/content",
  "visualDescription": "What the visual should look like",
  "shareabilityFactor": "Why people will want to share this",
  "caption": "Post caption"
}
\`\`\`

Focus on emotional resonance and relatability that drives shares.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const content = this.parseJSON<{
      concept: string;
      text: string;
      visualDescription: string;
      shareabilityFactor: string;
      caption: string;
    }>(response.data!);

    if (!content) {
      return { success: false, error: 'Failed to parse shareable content response' };
    }

    return { success: true, data: content, usage: response.usage };
  }
}
