/**
 * Apresagents - AI-powered Social Media Content Agents for Skincare Brands
 *
 * This package provides a suite of AI agents that work together to create,
 * optimize, and manage social media content for skincare e-commerce brands.
 */

// Types
export * from './types/index.js';

// Agents
export {
  BaseAgent,
  SocialMediaManagerAgent,
  ContentStrategyAgent,
  CopywritingAgent,
  VisualContentAgent,
  AdCampaignAgent,
  BrandVoiceAgent,
  InstagramAgent,
  TikTokAgent,
  FacebookAgent,
  PinterestAgent,
} from './agents/index.js';

// Configuration
export { getBrandConfig, sampleProducts, validateConfig, getSocialHandles, getContentThemes } from './config/index.js';

// Quick start function
import { SocialMediaManagerAgent } from './agents/index.js';
import { getBrandConfig } from './config/index.js';

/**
 * Create a pre-configured Social Media Manager with default brand settings
 */
export function createManager() {
  const brandConfig = getBrandConfig();
  return new SocialMediaManagerAgent(brandConfig);
}

/**
 * Example usage demonstration
 */
export async function demo() {
  console.log('🚀 Apresagents Demo\n');

  const manager = createManager();

  // Generate a simple content package
  console.log('Generating content for "winter skincare tips"...\n');

  const result = await manager.generateContentPackage('winter skincare tips', ['instagram', 'tiktok']);

  if (result.success && result.data) {
    console.log('✅ Content generated successfully!');
    console.log('\nInstagram caption preview:');
    console.log(result.data.content.instagram?.caption.substring(0, 200) + '...');
  } else {
    console.log('❌ Error:', result.error);
  }
}

// If running directly, show demo
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  demo().catch(console.error);
}
