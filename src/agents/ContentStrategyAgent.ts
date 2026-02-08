import { BaseAgent } from './BaseAgent.js';
import type {
  BrandConfig,
  ContentStrategy,
  ContentCalendarRequest,
  ContentCalendar,
  CalendarEntry,
  SocialPlatform,
  ContentCategory,
  AgentResponse,
} from '../types/index.js';

/**
 * Content Strategy Agent
 * Responsible for planning content calendars, identifying trends, and suggesting themes
 */
export class ContentStrategyAgent extends BaseAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Content Strategy Agent',
        description: 'Plans content calendars, identifies trends, and develops content strategy',
        systemPrompt: `You are an expert social media content strategist specializing in skincare and beauty brands. Your role is to:

1. Create comprehensive content calendars that balance promotional and educational content
2. Identify trending topics and opportunities in the skincare/beauty space
3. Develop content pillars that align with brand values
4. Suggest optimal posting times and frequencies for each platform
5. Plan seasonal and campaign-based content

When creating strategies, consider:
- Current skincare trends (clean beauty, sustainability, ingredient transparency)
- Seasonal skincare needs (winter hydration, summer SPF, etc.)
- Key shopping moments (holidays, sales events)
- Audience engagement patterns
- Platform-specific best practices

Always output structured data in JSON format when requested.`,
        temperature: 0.7,
      },
      brandConfig
    );
  }

  /**
   * Generate a comprehensive content strategy
   */
  async generateStrategy(
    duration: 'monthly' | 'quarterly' = 'monthly',
    focus?: string
  ): Promise<AgentResponse<ContentStrategy>> {
    const prompt = `Create a ${duration} content strategy for our skincare brand.
${focus ? `Focus area: ${focus}` : ''}

Please provide a comprehensive strategy in the following JSON format:
\`\`\`json
{
  "overallTheme": "string - the overarching theme for this period",
  "weeklyFocus": [
    {
      "week": 1,
      "theme": "string",
      "goals": ["string"],
      "keyMessages": ["string"]
    }
  ],
  "contentPillars": [
    {
      "name": "string",
      "description": "string",
      "postFrequency": "string (e.g., '2x per week')",
      "exampleTopics": ["string"]
    }
  ],
  "campaignIdeas": [
    {
      "name": "string",
      "description": "string",
      "timing": "string",
      "platforms": ["instagram", "tiktok", "facebook", "pinterest"],
      "estimatedImpact": "string"
    }
  ],
  "trendOpportunities": [
    {
      "trend": "string",
      "relevance": "string",
      "suggestedContent": "string",
      "urgency": "high" | "medium" | "low"
    }
  ]
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const strategy = this.parseJSON<ContentStrategy>(response.data!);
    if (!strategy) {
      return { success: false, error: 'Failed to parse strategy response' };
    }

    return { success: true, data: strategy, usage: response.usage };
  }

  /**
   * Generate a content calendar
   */
  async generateCalendar(request: ContentCalendarRequest): Promise<AgentResponse<ContentCalendar>> {
    const startStr = request.startDate.toISOString().split('T')[0];
    const endStr = request.endDate.toISOString().split('T')[0];

    const prompt = `Create a detailed content calendar for our skincare brand.

**Parameters:**
- Date Range: ${startStr} to ${endStr}
- Platforms: ${request.platforms.join(', ')}
- Posts per week: ${request.postsPerWeek}
${request.themes ? `- Focus themes: ${request.themes.join(', ')}` : ''}
${request.products ? `- Featured products: ${request.products.map((p) => p.name).join(', ')}` : ''}

Generate a calendar with specific entries for each post. Output in this JSON format:
\`\`\`json
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "dayOfWeek": "Monday",
      "platform": "instagram",
      "contentType": "post" | "story" | "reel" | "carousel" | "video" | "pin",
      "category": "product-highlight" | "ingredient-spotlight" | "skincare-routine" | "self-care-tips" | "behind-the-scenes" | "customer-story" | "educational" | "promotional" | "seasonal" | "trending",
      "theme": "string - specific theme for this post",
      "briefDescription": "string - 1-2 sentence description of the content",
      "suggestedTime": "HH:MM AM/PM timezone"
    }
  ],
  "summary": {
    "totalPosts": number,
    "postsByPlatform": { "instagram": number, "tiktok": number, ... },
    "postsByCategory": { "product-highlight": number, ... },
    "keyThemes": ["string"],
    "recommendations": ["string"]
  }
}
\`\`\`

Ensure variety in content types and categories while maintaining brand consistency.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const calendarData = this.parseJSON<{
      entries: CalendarEntry[];
      summary: ContentCalendar['summary'];
    }>(response.data!);

    if (!calendarData) {
      return { success: false, error: 'Failed to parse calendar response' };
    }

    const calendar: ContentCalendar = {
      id: `cal-${Date.now()}`,
      startDate: request.startDate,
      endDate: request.endDate,
      entries: calendarData.entries.map((entry) => ({
        ...entry,
        date: new Date(entry.date),
      })),
      summary: calendarData.summary,
    };

    return { success: true, data: calendar, usage: response.usage };
  }

  /**
   * Get content ideas for a specific theme or occasion
   */
  async getContentIdeas(
    theme: string,
    platforms: SocialPlatform[],
    count: number = 5
  ): Promise<AgentResponse<string>> {
    const prompt = `Generate ${count} creative content ideas for the theme: "${theme}"

Target platforms: ${platforms.join(', ')}

For each idea, provide:
1. A catchy title/hook
2. The content format best suited for it
3. Why it would resonate with our audience

Format as a numbered list.`;

    const response = await this.singleQuery(prompt);
    return response;
  }

  /**
   * Analyze trending topics and suggest relevant content
   */
  async analyzeTrends(): Promise<AgentResponse<string>> {
    const prompt = `Based on your knowledge of skincare and beauty trends, identify:

1. **Current Hot Topics** in skincare (ingredients, routines, concerns)
2. **Emerging Trends** that are gaining traction
3. **Evergreen Topics** that consistently perform well
4. **Seasonal Opportunities** for the current time of year

For each, explain how our brand could create relevant content and which platform would be best suited.`;

    return this.singleQuery(prompt);
  }

  /**
   * Suggest optimal posting schedule
   */
  async suggestPostingSchedule(platforms: SocialPlatform[]): Promise<AgentResponse<string>> {
    const prompt = `Create an optimal posting schedule for our skincare brand on: ${platforms.join(', ')}

Consider:
- Best times to post for skincare/beauty audiences
- Optimal posting frequency for each platform
- How to space content throughout the week
- Balancing different content types

Provide a detailed weekly schedule with specific times and content type suggestions.`;

    return this.singleQuery(prompt);
  }
}
