import { BaseAgent } from './BaseAgent.js';
import type {
  BrandConfig,
  Product,
  SocialPlatform,
  AdCampaignRequest,
  AdCampaign,
  AdCreative,
  AudienceTargeting,
  CampaignObjective,
  AgentResponse,
} from '../types/index.js';

/**
 * Ad Campaign Agent
 * Responsible for creating ad campaigns, targeting strategies, and ad creatives
 */
export class AdCampaignAgent extends BaseAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Ad Campaign Agent',
        description: 'Creates comprehensive ad campaigns with targeting and creative strategies',
        systemPrompt: `You are an expert paid social media advertising strategist specializing in skincare and beauty ecommerce. Your expertise includes:

1. Campaign strategy across Meta (Facebook/Instagram), TikTok, and Pinterest ads
2. Audience targeting and segmentation
3. Ad creative best practices for each platform
4. Budget allocation and optimization
5. A/B testing strategies
6. Conversion funnel optimization

Key Principles:
- Always start with clear objectives and KPIs
- Build full-funnel campaigns (awareness → consideration → conversion)
- Create platform-native ad creatives
- Use detailed audience targeting based on interests, behaviors, and demographics
- Recommend lookalike audiences and retargeting strategies
- Consider ad fatigue and creative refresh cycles
- Optimize for the right metric based on campaign objective

Platform Ad Specifications:
- Meta: Various placements (feed, stories, reels), detailed targeting
- TikTok: In-feed ads, Spark ads, TopView, branded effects
- Pinterest: Standard pins, video pins, shopping ads, collections

Always provide actionable, specific recommendations with clear reasoning.`,
        temperature: 0.7,
      },
      brandConfig
    );
  }

  /**
   * Create a complete ad campaign
   */
  async createCampaign(request: AdCampaignRequest): Promise<AgentResponse<AdCampaign>> {
    const prompt = `Create a comprehensive ad campaign with the following parameters:

**Objective:** ${request.objective}
**Platforms:** ${request.platforms.join(', ')}
${request.budget ? `**Budget:** $${request.budget}` : ''}
${request.duration ? `**Duration:** ${request.duration} days` : ''}
${request.product ? `**Product:** ${request.product.name} - ${request.product.description}` : ''}
${request.theme ? `**Campaign Theme:** ${request.theme}` : ''}

Target Audience:
${request.targetAudience ? `- Age: ${request.targetAudience.ageRange[0]}-${request.targetAudience.ageRange[1]}
- Gender: ${request.targetAudience.gender || 'all'}
- Interests: ${request.targetAudience.interests.join(', ')}
${request.targetAudience.locations ? `- Locations: ${request.targetAudience.locations.join(', ')}` : ''}` : '- Define optimal targeting for skincare audience'}

Output in JSON format:
\`\`\`json
{
  "name": "Campaign name",
  "objective": "${request.objective}",
  "platforms": ${JSON.stringify(request.platforms)},
  "ads": [
    {
      "platform": "instagram",
      "format": "reel",
      "headline": "Attention-grabbing headline",
      "primaryText": "Main ad copy",
      "callToAction": "CTA button text",
      "visualDescription": "What the ad creative should show",
      "visualPrompt": "Detailed prompt for generating the visual",
      "targetingNotes": "Specific targeting for this ad"
    }
  ],
  "targetAudience": {
    "ageRange": [25, 45],
    "gender": "female",
    "interests": ["skincare", "beauty", "self-care"],
    "behaviors": ["online shoppers", "engaged shoppers"],
    "locations": ["United States"]
  },
  "suggestedBudgetAllocation": {
    "instagram": 40,
    "facebook": 30,
    "tiktok": 20,
    "pinterest": 10
  },
  "estimatedReach": "Estimated reach description",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
\`\`\`

Create multiple ad variations for each platform to enable A/B testing.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const campaignData = this.parseJSON<Omit<AdCampaign, 'id'>>(response.data!);
    if (!campaignData) {
      return { success: false, error: 'Failed to parse campaign response' };
    }

    const campaign: AdCampaign = {
      id: `campaign-${Date.now()}`,
      ...campaignData,
    };

    return { success: true, data: campaign, usage: response.usage };
  }

  /**
   * Generate ad creatives for a specific platform
   */
  async generateAdCreatives(
    platform: SocialPlatform,
    objective: CampaignObjective,
    product: Product,
    count: number = 3
  ): Promise<AgentResponse<AdCreative[]>> {
    const prompt = `Create ${count} ad creative variations for ${platform} ads.

**Objective:** ${objective}
**Product:** ${product.name}
**Description:** ${product.description}
**Key Ingredients:** ${product.keyIngredients.join(', ')}
**Benefits:** ${product.benefits.join(', ')}
**Price:** $${product.price}

Output in JSON format:
\`\`\`json
[
  {
    "platform": "${platform}",
    "format": "The ad format (feed, story, reel, etc.)",
    "headline": "Headline (max 40 chars)",
    "primaryText": "Main ad copy",
    "callToAction": "CTA button text",
    "visualDescription": "Detailed visual description",
    "visualPrompt": "AI image generation prompt",
    "targetingNotes": "Who this creative is best for"
  }
]
\`\`\`

Create diverse variations:
1. One focusing on product benefits
2. One using social proof/testimonial style
3. One with a problem-solution narrative`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const creatives = this.parseJSON<AdCreative[]>(response.data!);
    if (!creatives) {
      return { success: false, error: 'Failed to parse ad creatives response' };
    }

    return { success: true, data: creatives, usage: response.usage };
  }

  /**
   * Create audience targeting strategy
   */
  async createAudienceStrategy(
    product?: Product
  ): Promise<
    AgentResponse<{
      coreAudience: AudienceTargeting;
      lookalikes: Array<{ source: string; description: string }>;
      retargeting: Array<{ segment: string; strategy: string }>;
      exclusions: string[];
      testingPlan: string;
    }>
  > {
    const prompt = `Create a comprehensive audience targeting strategy for our skincare brand${product ? ` (featuring ${product.name})` : ''}.

Output in JSON format:
\`\`\`json
{
  "coreAudience": {
    "ageRange": [25, 45],
    "gender": "female",
    "interests": ["skincare interests"],
    "behaviors": ["shopping behaviors"],
    "locations": ["target locations"]
  },
  "lookalikes": [
    {
      "source": "Source audience (e.g., purchasers, email list)",
      "description": "Why this lookalike is valuable"
    }
  ],
  "retargeting": [
    {
      "segment": "Audience segment",
      "strategy": "How to retarget this segment"
    }
  ],
  "exclusions": ["Audiences to exclude"],
  "testingPlan": "How to test and refine audiences"
}
\`\`\`

Consider the full customer journey from awareness to purchase.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const strategy = this.parseJSON<{
      coreAudience: AudienceTargeting;
      lookalikes: Array<{ source: string; description: string }>;
      retargeting: Array<{ segment: string; strategy: string }>;
      exclusions: string[];
      testingPlan: string;
    }>(response.data!);

    if (!strategy) {
      return { success: false, error: 'Failed to parse audience strategy response' };
    }

    return { success: true, data: strategy, usage: response.usage };
  }

  /**
   * Create a retargeting campaign
   */
  async createRetargetingCampaign(
    segment: 'cart-abandoners' | 'website-visitors' | 'past-purchasers' | 'engagers',
    platforms: SocialPlatform[]
  ): Promise<
    AgentResponse<{
      segmentStrategy: string;
      ads: AdCreative[];
      sequencing: Array<{ day: number; action: string }>;
      expectedConversionRate: string;
    }>
  > {
    const prompt = `Create a retargeting campaign for ${segment} on ${platforms.join(', ')}.

Output in JSON format:
\`\`\`json
{
  "segmentStrategy": "How to define and reach this segment",
  "ads": [
    {
      "platform": "platform",
      "format": "format",
      "headline": "Retargeting headline",
      "primaryText": "Copy that addresses their stage in the journey",
      "callToAction": "CTA",
      "visualDescription": "Visual approach",
      "visualPrompt": "Image generation prompt",
      "targetingNotes": "Specific retargeting parameters"
    }
  ],
  "sequencing": [
    {
      "day": 1,
      "action": "What ad to show"
    }
  ],
  "expectedConversionRate": "Expected performance"
}
\`\`\`

Create a sequence that moves people toward conversion without being annoying.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const campaign = this.parseJSON<{
      segmentStrategy: string;
      ads: AdCreative[];
      sequencing: Array<{ day: number; action: string }>;
      expectedConversionRate: string;
    }>(response.data!);

    if (!campaign) {
      return { success: false, error: 'Failed to parse retargeting campaign response' };
    }

    return { success: true, data: campaign, usage: response.usage };
  }

  /**
   * Suggest budget allocation
   */
  async suggestBudgetAllocation(
    totalBudget: number,
    platforms: SocialPlatform[],
    objective: CampaignObjective
  ): Promise<
    AgentResponse<{
      allocation: Record<SocialPlatform, { amount: number; percentage: number; reasoning: string }>;
      funnelBreakdown: { awareness: number; consideration: number; conversion: number };
      recommendations: string[];
    }>
  > {
    const prompt = `Suggest budget allocation for a ${objective} campaign.

**Total Budget:** $${totalBudget}
**Platforms:** ${platforms.join(', ')}

Output in JSON format:
\`\`\`json
{
  "allocation": {
    "instagram": {
      "amount": 1000,
      "percentage": 40,
      "reasoning": "Why this allocation"
    }
  },
  "funnelBreakdown": {
    "awareness": 30,
    "consideration": 40,
    "conversion": 30
  },
  "recommendations": ["Budget optimization tips"]
}
\`\`\`

Base recommendations on platform performance benchmarks for skincare brands.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const allocation = this.parseJSON<{
      allocation: Record<SocialPlatform, { amount: number; percentage: number; reasoning: string }>;
      funnelBreakdown: { awareness: number; consideration: number; conversion: number };
      recommendations: string[];
    }>(response.data!);

    if (!allocation) {
      return { success: false, error: 'Failed to parse budget allocation response' };
    }

    return { success: true, data: allocation, usage: response.usage };
  }

  /**
   * Generate A/B testing plan
   */
  async createABTestPlan(
    campaignType: string
  ): Promise<
    AgentResponse<{
      tests: Array<{
        variable: string;
        hypothesis: string;
        variants: string[];
        successMetric: string;
        duration: string;
      }>;
      prioritization: string;
      learningAgenda: string[];
    }>
  > {
    const prompt = `Create an A/B testing plan for a ${campaignType} ad campaign.

Output in JSON format:
\`\`\`json
{
  "tests": [
    {
      "variable": "What's being tested",
      "hypothesis": "What we expect to learn",
      "variants": ["Variant A description", "Variant B description"],
      "successMetric": "How to measure winner",
      "duration": "How long to run the test"
    }
  ],
  "prioritization": "Which tests to run first and why",
  "learningAgenda": ["Key questions we want to answer"]
}
\`\`\`

Focus on tests that will have the biggest impact on campaign performance.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const testPlan = this.parseJSON<{
      tests: Array<{
        variable: string;
        hypothesis: string;
        variants: string[];
        successMetric: string;
        duration: string;
      }>;
      prioritization: string;
      learningAgenda: string[];
    }>(response.data!);

    if (!testPlan) {
      return { success: false, error: 'Failed to parse A/B test plan response' };
    }

    return { success: true, data: testPlan, usage: response.usage };
  }
}
