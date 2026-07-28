import { BasePlatformAgent, PlatformSpecs } from './BasePlatformAgent.js';
import type { BrandConfig, Product, AgentResponse } from '../../types/index.js';

const pinterestSpecs: PlatformSpecs = {
  platform: 'pinterest',
  maxCaptionLength: 500,
  maxHashtags: 20,
  supportedContentTypes: ['pin', 'video', 'carousel'],
  optimalPostTimes: ['8-11 PM', '2-4 PM on weekends'],
  aspectRatios: {
    post: '2:3',
    story: '9:16',
    reel: '9:16',
    carousel: '2:3',
    video: '2:3 or 9:16',
    pin: '2:3',
    ad: '2:3',
  },
  bestPractices: [
    'Use vertical images (2:3 ratio) for maximum visibility',
    'Include text overlay on images for context',
    'Write SEO-optimized descriptions with keywords',
    'Create boards organized by topic/category',
    'Pin consistently (5-25 pins per day)',
    'Use Rich Pins for products',
    'Focus on evergreen, searchable content',
    'Create step-by-step tutorials and how-tos',
  ],
};

/**
 * Pinterest-specialized agent
 */
export class PinterestAgent extends BasePlatformAgent {
  constructor(brandConfig: BrandConfig) {
    super(
      brandConfig,
      pinterestSpecs,
      `## Pinterest-Specific Expertise
You understand:
- Pinterest as a visual search engine (SEO is crucial)
- How to write keyword-rich, searchable descriptions
- The importance of vertical imagery and text overlays
- Board organization and curation
- Pinterest shopping and catalog features
- Idea Pins for storytelling
- The long lifespan of Pinterest content
- How Pinterest drives website traffic`
    );
  }

  /**
   * Generate SEO-optimized pin
   */
  async generatePin(
    topic: string,
    product?: Product
  ): Promise<
    AgentResponse<{
      title: string;
      description: string;
      keywords: string[];
      textOverlay: string;
      visualDescription: string;
      boardSuggestions: string[];
      altText: string;
    }>
  > {
    const prompt = `Create an SEO-optimized Pinterest pin for: "${topic}"
${product ? `\nProduct: ${product.name} - ${product.description}` : ''}

Output in JSON format:
\`\`\`json
{
  "title": "SEO-optimized pin title (keyword-rich)",
  "description": "500-char max description with relevant keywords naturally incorporated",
  "keywords": ["main", "keywords", "for", "this", "pin"],
  "textOverlay": "Text to display on the pin image",
  "visualDescription": "Detailed description of the pin visual (2:3 ratio)",
  "boardSuggestions": ["Board names where this pin would fit"],
  "altText": "Accessible alt text for the image"
}
\`\`\`

Focus on searchability and evergreen value.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const pinData = this.parseJSON<{
      title: string;
      description: string;
      keywords: string[];
      textOverlay: string;
      visualDescription: string;
      boardSuggestions: string[];
      altText: string;
    }>(response.data!);

    if (!pinData) {
      return { success: false, error: 'Failed to parse pin response' };
    }

    return { success: true, data: pinData, usage: response.usage };
  }

  /**
   * Generate board strategy
   */
  async generateBoardStrategy(): Promise<
    AgentResponse<{
      boards: Array<{
        name: string;
        description: string;
        keywords: string[];
        pinTypes: string[];
        frequency: string;
      }>;
      overallStrategy: string;
    }>
  > {
    const prompt = `Create a Pinterest board strategy for our skincare brand.

Output in JSON format:
\`\`\`json
{
  "boards": [
    {
      "name": "Board name",
      "description": "SEO-optimized board description",
      "keywords": ["relevant", "keywords"],
      "pinTypes": ["Types of pins for this board"],
      "frequency": "How often to pin to this board"
    }
  ],
  "overallStrategy": "Overall Pinterest strategy notes"
}
\`\`\`

Create boards that capture different search intents and customer journeys.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const strategy = this.parseJSON<{
      boards: Array<{
        name: string;
        description: string;
        keywords: string[];
        pinTypes: string[];
        frequency: string;
      }>;
      overallStrategy: string;
    }>(response.data!);

    if (!strategy) {
      return { success: false, error: 'Failed to parse board strategy response' };
    }

    return { success: true, data: strategy, usage: response.usage };
  }

  /**
   * Generate Idea Pin (multi-page story format)
   */
  async generateIdeaPin(
    topic: string,
    numberOfPages: number = 5
  ): Promise<
    AgentResponse<{
      title: string;
      pages: Array<{
        pageNumber: number;
        visualDescription: string;
        textOverlay: string;
        voiceoverScript?: string;
      }>;
      tags: string[];
      ingredients?: string[];
      notes: string;
    }>
  > {
    const prompt = `Create a ${numberOfPages}-page Pinterest Idea Pin for: "${topic}"

Output in JSON format:
\`\`\`json
{
  "title": "Idea Pin title",
  "pages": [
    {
      "pageNumber": 1,
      "visualDescription": "What's shown on this page",
      "textOverlay": "Text on screen",
      "voiceoverScript": "Optional voiceover text"
    }
  ],
  "tags": ["relevant", "topic", "tags"],
  "ingredients": ["If applicable, list ingredients/products used"],
  "notes": "Creator notes/tips"
}
\`\`\`

Design for engagement and saves. Idea Pins should tell a complete story or tutorial.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const ideaPin = this.parseJSON<{
      title: string;
      pages: Array<{
        pageNumber: number;
        visualDescription: string;
        textOverlay: string;
        voiceoverScript?: string;
      }>;
      tags: string[];
      ingredients?: string[];
      notes: string;
    }>(response.data!);

    if (!ideaPin) {
      return { success: false, error: 'Failed to parse Idea Pin response' };
    }

    return { success: true, data: ideaPin, usage: response.usage };
  }

  /**
   * Generate product pin for shopping
   */
  async generateProductPin(product: Product): Promise<
    AgentResponse<{
      title: string;
      description: string;
      keywords: string[];
      visualConcept: string;
      textOverlay: string;
      lifestyle: string;
      relatedBoards: string[];
    }>
  > {
    const prompt = `Create a Pinterest product pin for:

Product: ${product.name}
Description: ${product.description}
Key Ingredients: ${product.keyIngredients.join(', ')}
Benefits: ${product.benefits.join(', ')}
Price: $${product.price}
Category: ${product.category}

Output in JSON format:
\`\`\`json
{
  "title": "Product pin title (searchable)",
  "description": "SEO-optimized description highlighting benefits and keywords",
  "keywords": ["product", "related", "keywords"],
  "visualConcept": "How to photograph/display the product",
  "textOverlay": "Text to overlay on the image",
  "lifestyle": "Lifestyle context to show the product in",
  "relatedBoards": ["Boards where this would fit"]
}
\`\`\`

Optimize for both search discovery and purchase intent.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const productPin = this.parseJSON<{
      title: string;
      description: string;
      keywords: string[];
      visualConcept: string;
      textOverlay: string;
      lifestyle: string;
      relatedBoards: string[];
    }>(response.data!);

    if (!productPin) {
      return { success: false, error: 'Failed to parse product pin response' };
    }

    return { success: true, data: productPin, usage: response.usage };
  }

  /**
   * Generate seasonal/trending pin ideas
   */
  async generateSeasonalPins(
    season: 'spring' | 'summer' | 'fall' | 'winter',
    count: number = 10
  ): Promise<
    AgentResponse<
      Array<{
        title: string;
        concept: string;
        keywords: string[];
        bestPostingWindow: string;
      }>
    >
  > {
    const prompt = `Generate ${count} seasonal Pinterest pin ideas for ${season} skincare content.

Output in JSON format:
\`\`\`json
[
  {
    "title": "Pin title",
    "concept": "Brief concept description",
    "keywords": ["seasonal", "keywords"],
    "bestPostingWindow": "When to post for maximum impact"
  }
]
\`\`\`

Consider seasonal skincare needs, holidays, and search trends for ${season}.`;

    const response = await this.singleQuery(prompt);
    if (!response.success) {
      return { success: false, error: response.error };
    }

    const pins = this.parseJSON<
      Array<{
        title: string;
        concept: string;
        keywords: string[];
        bestPostingWindow: string;
      }>
    >(response.data!);

    if (!pins) {
      return { success: false, error: 'Failed to parse seasonal pins response' };
    }

    return { success: true, data: pins, usage: response.usage };
  }
}
