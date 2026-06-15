import { BaseAgent } from './BaseAgent.js';
import type { BrandConfig, SocialPlatform, AgentResponse } from '../types/index.js';

/**
 * Brand Voice Agent
 * Responsible for maintaining consistent brand voice, messaging, and guidelines
 */
export class BrandVoiceAgent extends BaseAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Brand Voice Agent',
        description: 'Maintains brand consistency, voice guidelines, and messaging frameworks',
        systemPrompt: `You are a brand strategist and voice consultant specializing in skincare and beauty brands. Your role is to:

1. Define and maintain consistent brand voice across all channels
2. Create messaging frameworks and key talking points
3. Review content for brand alignment
4. Develop tone variations for different contexts
5. Create brand vocabulary and phrase libraries
6. Ensure inclusive, body-positive messaging

Brand Voice Principles:
- Authenticity: Genuine, not salesy or hyperbolic
- Education: Informative without being condescending
- Empowerment: Helping customers feel confident
- Warmth: Friendly and approachable
- Quality: Reflecting premium but accessible positioning

Key Considerations:
- Skincare language should be hopeful, not fear-based
- Avoid absolute claims ("cure", "miracle", "guaranteed results")
- Celebrate all skin types and tones
- Focus on self-care and wellness, not perfection
- Use inclusive language and representation

You ensure every piece of content sounds unmistakably like the brand.`,
        temperature: 0.6,
      },
      brandConfig
    );
  }

  /**
   * Generate comprehensive brand voice guidelines
   */
  async generateVoiceGuidelines(): Promise<
    AgentResponse<{
      voicePillars: Array<{ pillar: string; description: string; examples: string[] }>;
      toneSpectrum: Array<{ context: string; tone: string; example: string }>;
      vocabulary: {
        preferred: string[];
        avoid: string[];
        signature: string[];
      };
      grammarAndStyle: string[];
      platformAdaptations: Record<SocialPlatform, string>;
    }>
  > {
    const prompt = `Create comprehensive brand voice guidelines for our skincare brand.

Brand Context:
- Name: ${this.brandConfig.name}
- Description: ${this.brandConfig.description}
- Core Tone: ${this.brandConfig.tone.join(', ')}
- Target Audience: ${this.brandConfig.targetAudience}

Output in JSON format:
\`\`\`json
{
  "voicePillars": [
    {
      "pillar": "Pillar name (e.g., 'Warm & Welcoming')",
      "description": "What this means for our content",
      "examples": ["Example phrase 1", "Example phrase 2"]
    }
  ],
  "toneSpectrum": [
    {
      "context": "When to use this tone (e.g., 'Product launches')",
      "tone": "Excited but not hyperbolic",
      "example": "Example of content in this tone"
    }
  ],
  "vocabulary": {
    "preferred": ["Words we love to use"],
    "avoid": ["Words we never use"],
    "signature": ["Unique phrases that define our brand"]
  },
  "grammarAndStyle": ["Specific style rules"],
  "platformAdaptations": {
    "instagram": "How voice adapts for Instagram",
    "tiktok": "How voice adapts for TikTok",
    "facebook": "How voice adapts for Facebook",
    "pinterest": "How voice adapts for Pinterest"
  }
}
\`\`\`

Make the guidelines actionable and specific enough to ensure consistency.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const guidelines = this.parseJSON<{
      voicePillars: Array<{ pillar: string; description: string; examples: string[] }>;
      toneSpectrum: Array<{ context: string; tone: string; example: string }>;
      vocabulary: {
        preferred: string[];
        avoid: string[];
        signature: string[];
      };
      grammarAndStyle: string[];
      platformAdaptations: Record<SocialPlatform, string>;
    }>(response.data!);

    if (!guidelines) {
      return { success: false, error: 'Failed to parse voice guidelines response' };
    }

    return { success: true, data: guidelines, usage: response.usage };
  }

  /**
   * Review content for brand alignment
   */
  async reviewContent(
    content: string,
    platform: SocialPlatform
  ): Promise<
    AgentResponse<{
      overallScore: number;
      onBrand: string[];
      offBrand: string[];
      suggestions: string[];
      revisedContent?: string;
    }>
  > {
    const prompt = `Review this ${platform} content for brand alignment:

Content:
"${content}"

Evaluate against our brand voice:
- Tone: ${this.brandConfig.tone.join(', ')}
- Target Audience: ${this.brandConfig.targetAudience}

Output in JSON format:
\`\`\`json
{
  "overallScore": 85,
  "onBrand": ["What's working well"],
  "offBrand": ["What doesn't fit our voice"],
  "suggestions": ["Specific improvements"],
  "revisedContent": "Optional: A revised version if significant changes needed"
}
\`\`\`

Be constructive and specific in feedback.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const review = this.parseJSON<{
      overallScore: number;
      onBrand: string[];
      offBrand: string[];
      suggestions: string[];
      revisedContent?: string;
    }>(response.data!);

    if (!review) {
      return { success: false, error: 'Failed to parse content review response' };
    }

    return { success: true, data: review, usage: response.usage };
  }

  /**
   * Generate messaging framework for a topic/campaign
   */
  async createMessagingFramework(
    topic: string
  ): Promise<
    AgentResponse<{
      coreMessage: string;
      supportingMessages: string[];
      proofPoints: string[];
      headlines: string[];
      taglines: string[];
      callToActions: string[];
      objectionHandling: Array<{ objection: string; response: string }>;
    }>
  > {
    const prompt = `Create a messaging framework for: "${topic}"

Output in JSON format:
\`\`\`json
{
  "coreMessage": "The single most important thing to communicate",
  "supportingMessages": ["Key supporting points"],
  "proofPoints": ["Evidence and credibility builders"],
  "headlines": ["5 headline options"],
  "taglines": ["3 tagline options"],
  "callToActions": ["5 CTA options"],
  "objectionHandling": [
    {
      "objection": "Common customer concern",
      "response": "How to address it on-brand"
    }
  ]
}
\`\`\`

Ensure all messaging is consistent with our brand voice.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const framework = this.parseJSON<{
      coreMessage: string;
      supportingMessages: string[];
      proofPoints: string[];
      headlines: string[];
      taglines: string[];
      callToActions: string[];
      objectionHandling: Array<{ objection: string; response: string }>;
    }>(response.data!);

    if (!framework) {
      return { success: false, error: 'Failed to parse messaging framework response' };
    }

    return { success: true, data: framework, usage: response.usage };
  }

  /**
   * Generate response templates for common scenarios
   */
  async generateResponseTemplates(
    scenario: 'customer-inquiry' | 'complaint' | 'compliment' | 'collaboration-request' | 'faq'
  ): Promise<
    AgentResponse<
      Array<{
        situation: string;
        template: string;
        tone: string;
        dosDonts: { dos: string[]; donts: string[] };
      }>
    >
  > {
    const prompt = `Create response templates for ${scenario} scenarios.

Output in JSON format:
\`\`\`json
[
  {
    "situation": "Specific situation description",
    "template": "Template response (with [PLACEHOLDERS] for personalization)",
    "tone": "The tone to use",
    "dosDonts": {
      "dos": ["What to do"],
      "donts": ["What to avoid"]
    }
  }
]
\`\`\`

Create 5 templates that maintain our brand voice while being genuine and helpful.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const templates = this.parseJSON<
      Array<{
        situation: string;
        template: string;
        tone: string;
        dosDonts: { dos: string[]; donts: string[] };
      }>
    >(response.data!);

    if (!templates) {
      return { success: false, error: 'Failed to parse response templates' };
    }

    return { success: true, data: templates, usage: response.usage };
  }

  /**
   * Translate content to different tones while maintaining brand voice
   */
  async adaptTone(
    content: string,
    targetTone: 'playful' | 'professional' | 'educational' | 'inspiring' | 'urgent'
  ): Promise<AgentResponse<string>> {
    const prompt = `Adapt this content to a ${targetTone} tone while maintaining our brand voice:

Original Content:
"${content}"

Brand Tone: ${this.brandConfig.tone.join(', ')}

Provide the adapted content that feels ${targetTone} but still unmistakably us.`;

    return this.singleQuery(prompt);
  }

  /**
   * Generate brand story variations
   */
  async generateBrandStory(
    format: 'elevator-pitch' | 'about-us' | 'founder-story' | 'mission-statement' | 'social-bio',
    platform?: SocialPlatform
  ): Promise<AgentResponse<string>> {
    const prompt = `Write our brand story in ${format} format${platform ? ` optimized for ${platform}` : ''}.

Brand Context:
- Name: ${this.brandConfig.name}
- Description: ${this.brandConfig.description}
- Tone: ${this.brandConfig.tone.join(', ')}
- Target Audience: ${this.brandConfig.targetAudience}

Create a compelling ${format} that captures our essence and connects with our audience.`;

    return this.singleQuery(prompt);
  }

  /**
   * Check content for inclusive language
   */
  async checkInclusivity(content: string): Promise<
    AgentResponse<{
      score: number;
      issues: Array<{ text: string; issue: string; suggestion: string }>;
      strengths: string[];
      revisedContent?: string;
    }>
  > {
    const prompt = `Review this content for inclusive language:

"${content}"

Check for:
- Gender-neutral language
- Skin tone and type inclusivity
- Age-inclusive messaging
- Body-positive framing
- Ability-inclusive language
- Cultural sensitivity

Output in JSON format:
\`\`\`json
{
  "score": 85,
  "issues": [
    {
      "text": "Problematic text",
      "issue": "Why it's problematic",
      "suggestion": "Better alternative"
    }
  ],
  "strengths": ["What's done well"],
  "revisedContent": "Fully inclusive version if changes needed"
}
\`\`\``;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const review = this.parseJSON<{
      score: number;
      issues: Array<{ text: string; issue: string; suggestion: string }>;
      strengths: string[];
      revisedContent?: string;
    }>(response.data!);

    if (!review) {
      return { success: false, error: 'Failed to parse inclusivity review response' };
    }

    return { success: true, data: review, usage: response.usage };
  }
}
