# Apresagents

AI-powered social media content and advertisement agents for skincare e-commerce brands.

## Overview

Apresagents is a comprehensive suite of AI agents built with the Claude API that work together to create, optimize, and manage social media content. Designed specifically for skincare and beauty brands, these agents understand industry-specific nuances, trends, and best practices.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Social Media Manager Agent                   │
│              (Main Orchestrator)                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Strategy    │    │  Copywriting  │    │    Visual     │
│    Agent      │    │    Agent      │    │    Agent      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Ad Campaign  │    │  Brand Voice  │    │   Platform    │
│    Agent      │    │    Agent      │    │   Agents      │
└───────────────┘    └───────────────┘    └───────────────┘
                                                  │
                    ┌─────────┬─────────┬─────────┼─────────┐
                    │         │         │         │         │
                    ▼         ▼         ▼         ▼         ▼
               Instagram  TikTok  Facebook  Pinterest  (more)
```

## Agents

### 1. Social Media Manager Agent
The main orchestrator that coordinates all sub-agents to create comprehensive content packages.

### 2. Content Strategy Agent
- Plans content calendars
- Identifies trends and opportunities
- Develops content pillars
- Suggests optimal posting schedules

### 3. Copywriting Agent
- Creates engaging captions
- Writes ad copy
- Generates hashtag strategies
- Produces product descriptions

### 4. Visual Content Agent
- Creates AI image generation prompts
- Designs visual concepts
- Plans photo/video shoots
- Develops brand style guidelines

### 5. Ad Campaign Agent
- Creates full ad campaigns
- Develops targeting strategies
- Allocates budgets
- Plans A/B tests

### 6. Brand Voice Agent
- Maintains brand consistency
- Reviews content for alignment
- Creates messaging frameworks
- Ensures inclusive language

### 7. Platform Specialist Agents
- **Instagram Agent**: Reels, Stories, Grid posts, Carousels
- **TikTok Agent**: Viral videos, Trends, Tutorials
- **Facebook Agent**: Community posts, Lives, Groups
- **Pinterest Agent**: SEO-optimized Pins, Boards, Idea Pins

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd Apresagents

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Anthropic API key and brand settings

# Build the project
npm run build
```

## Usage

### CLI Commands

```bash
# Generate content for a topic
npm run generate -- -t "winter skincare tips" -p instagram,tiktok

# Interactive content generation
npm run generate -- -i

# Create an ad campaign
npm run campaign -- -o awareness -b 1000 -p instagram,facebook

# Generate a content calendar
npm run calendar -- -d 14 -p instagram,tiktok -f 7

# Create video content
npx tsx src/cli.ts video -t "morning routine" -p tiktok

# Generate brand guidelines
npx tsx src/cli.ts brand

# List available products
npx tsx src/cli.ts products
```

### Programmatic Usage

```typescript
import { SocialMediaManagerAgent, getBrandConfig } from 'apresagents';

// Initialize with your brand config
const brandConfig = getBrandConfig();
const manager = new SocialMediaManagerAgent(brandConfig);

// Generate content package
const content = await manager.generateContentPackage(
  'hydration tips for dry skin',
  ['instagram', 'tiktok', 'pinterest']
);

// Create ad campaign
const campaign = await manager.createAdCampaign({
  objective: 'conversions',
  platforms: ['instagram', 'facebook'],
  budget: 5000,
  product: myProduct,
});

// Get content strategy
const strategy = await manager.getContentStrategy('monthly', 'product launches');
```

### Using Individual Agents

```typescript
import {
  CopywritingAgent,
  InstagramAgent,
  VisualContentAgent,
} from 'apresagents';

const brandConfig = getBrandConfig();

// Use copywriting agent directly
const copywriter = new CopywritingAgent(brandConfig);
const caption = await copywriter.generateCaption('instagram', 'self-care Sunday');

// Use Instagram agent for platform-specific content
const instagram = new InstagramAgent(brandConfig);
const reel = await instagram.generateReelConcept('skincare routine');

// Generate visual concepts
const visualAgent = new VisualContentAgent(brandConfig);
const imagePrompt = await visualAgent.generateImagePrompt('product flatlay', 'instagram');
```

## Configuration

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=your-api-key-here

# Brand Configuration
BRAND_NAME=Your Brand Name
BRAND_DESCRIPTION=Your brand description
BRAND_TONE=warm, approachable, luxurious
BRAND_TARGET_AUDIENCE=Women 25-45 interested in skincare

# Social Media Handles
INSTAGRAM_HANDLE=@yourbrand
TIKTOK_HANDLE=@yourbrand
FACEBOOK_PAGE=YourBrand
PINTEREST_HANDLE=yourbrand

# Content Settings
DEFAULT_HASHTAG_COUNT=15
CONTENT_THEMES=skincare,wellness,self-care
```

### Custom Brand Configuration

```typescript
import { SocialMediaManagerAgent, BrandConfig } from 'apresagents';

const customBrandConfig: BrandConfig = {
  name: 'My Skincare Brand',
  description: 'Organic skincare for sensitive skin',
  tone: ['gentle', 'nurturing', 'scientific', 'trustworthy'],
  targetAudience: 'People with sensitive skin looking for clean beauty',
  products: [
    {
      id: 'prod-001',
      name: 'Calming Serum',
      description: 'A gentle serum for reactive skin',
      keyIngredients: ['Centella Asiatica', 'Niacinamide'],
      benefits: ['Reduces redness', 'Calms irritation'],
      price: 45,
      category: 'Serums',
    },
  ],
  keywords: ['sensitive skin', 'clean beauty', 'organic'],
};

const manager = new SocialMediaManagerAgent(customBrandConfig);
```

## Output Examples

### Generated Content Package

```json
{
  "topic": "winter skincare tips",
  "content": {
    "instagram": {
      "caption": "Winter called and it wants to steal your glow ❄️\n\nBut we're not letting that happen...",
      "hashtags": ["winterskincarecare", "dryskinrelief", "glowup"],
      "callToAction": "Save this for your winter routine!",
      "visualDescription": "Cozy flatlay with skincare products, knit blanket, warm lighting",
      "visualPrompt": "Product photography, warm cozy aesthetic..."
    },
    "tiktok": {
      "caption": "POV: Your skin in winter vs your skin with this routine",
      "hashtags": ["skincare", "wintervibes", "dryskin"],
      "callToAction": "Follow for more skincare tips!"
    }
  },
  "brandVoiceCheck": {
    "score": 92,
    "feedback": "Great use of conversational tone..."
  }
}
```

### Generated Ad Campaign

```json
{
  "name": "Winter Hydration Campaign",
  "objective": "conversions",
  "platforms": ["instagram", "facebook"],
  "ads": [
    {
      "platform": "instagram",
      "format": "reel",
      "headline": "Dry Skin? Not Anymore.",
      "primaryText": "Discover the hydrating serum that's changing winter skincare...",
      "callToAction": "Shop Now",
      "visualDescription": "Before/after skin transformation"
    }
  ],
  "targetAudience": {
    "ageRange": [25, 45],
    "interests": ["skincare", "beauty", "self-care"]
  },
  "suggestedBudgetAllocation": {
    "instagram": 60,
    "facebook": 40
  }
}
```

## Project Structure

```
Apresagents/
├── src/
│   ├── agents/
│   │   ├── BaseAgent.ts              # Base agent class
│   │   ├── SocialMediaManagerAgent.ts # Main orchestrator
│   │   ├── ContentStrategyAgent.ts   # Strategy planning
│   │   ├── CopywritingAgent.ts       # Text content
│   │   ├── VisualContentAgent.ts     # Visual concepts
│   │   ├── AdCampaignAgent.ts        # Paid advertising
│   │   ├── BrandVoiceAgent.ts        # Brand consistency
│   │   └── platforms/
│   │       ├── InstagramAgent.ts
│   │       ├── TikTokAgent.ts
│   │       ├── FacebookAgent.ts
│   │       └── PinterestAgent.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript types
│   ├── config/
│   │   └── index.ts                  # Configuration
│   ├── cli.ts                        # CLI interface
│   └── index.ts                      # Main exports
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Run production build
npm start
```

## Best Practices

1. **Always review generated content** before posting - AI is a powerful assistant, not a replacement for human judgment.

2. **Customize your brand config** thoroughly for best results - the more context the agents have, the better the output.

3. **Use the Brand Voice Agent** to maintain consistency across all content.

4. **Start with the Content Strategy Agent** when planning major campaigns.

5. **Iterate on prompts** - use the agents interactively to refine content.

## License

MIT
