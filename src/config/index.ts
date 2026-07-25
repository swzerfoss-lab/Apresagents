import dotenv from 'dotenv';
import type { BrandConfig, Product } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Get brand configuration from environment variables
 */
export function getBrandConfig(): BrandConfig {
  const name = process.env.BRAND_NAME || 'Apres Feels';
  const description =
    process.env.BRAND_DESCRIPTION ||
    'Premium and luxury skincare, muscle care, muscle recovery, and body recovery company for winter sports enthusiasts. Geared towards individuals engaged in skiing, snowboarding, cross country skiing, hiking, and mountaineering, as well as the associated après scenes and social events.';
  const toneStr = process.env.BRAND_TONE || 'work hard play hard, adventurous, fun, premium, luxury';
  const targetAudience =
    process.env.BRAND_TARGET_AUDIENCE ||
    'Males and females aged 28-55 passionate about winter sports and mountain lifestyle';

  return {
    name,
    description,
    tone: toneStr.split(',').map((t) => t.trim()),
    targetAudience,
    keywords: process.env.BRAND_KEYWORDS?.split(',').map((k) => k.trim()) || [
      'skiing',
      'snowboarding',
      'après-ski',
      'mountain lifestyle',
      'muscle recovery',
      'skincare',
      'winter sports',
      'luxury',
      'premium',
      'natural ingredients',
    ],
  };
}

/**
 * Default products for demonstration
 * These represent Apres Feels' premium winter sports recovery line
 */
export const sampleProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Alpine Recovery Muscle Balm',
    description:
      'A luxurious, fast-absorbing muscle recovery balm crafted for athletes who push their limits on the mountain. Deeply penetrating formula soothes tired muscles after intense ski days.',
    keyIngredients: ['Arnica Montana', 'Menthol', 'Eucalyptus Oil', 'Shea Butter', 'CBD'],
    benefits: [
      'Rapid muscle recovery',
      'Soothes post-ski soreness',
      'Deep tissue penetration',
      'Natural anti-inflammatory',
    ],
    price: 68,
    category: 'Muscle Care',
  },
  {
    id: 'prod-002',
    name: 'Summit Shield Face Cream',
    description:
      'Premium protective face cream designed for harsh mountain conditions. Shields skin from wind, cold, and UV exposure while delivering deep hydration.',
    keyIngredients: ['Vitamin E', 'Squalane', 'Arctic Cloudberry', 'Ceramides', 'Zinc Oxide'],
    benefits: [
      'Cold weather protection',
      'Wind barrier formula',
      'Intense hydration',
      'UV defense',
    ],
    price: 85,
    category: 'Skincare',
  },
  {
    id: 'prod-003',
    name: 'Après Glow Body Oil',
    description:
      'A silky, aromatic body oil that transforms your post-mountain ritual into a luxury spa experience. Nourishes skin while easing muscle tension.',
    keyIngredients: ['Jojoba Oil', 'Lavender', 'Vitamin E', 'Rosehip', 'Chamomile'],
    benefits: [
      'Deep skin nourishment',
      'Relaxing aromatherapy',
      'Muscle tension relief',
      'Radiant skin glow',
    ],
    price: 72,
    category: 'Body Care',
  },
  {
    id: 'prod-004',
    name: 'Powder Day Lip Treatment',
    description:
      'Intensive lip repair and protection for extreme mountain conditions. Heals chapped, windburned lips while providing all-day moisture.',
    keyIngredients: ['Beeswax', 'Manuka Honey', 'Vitamin E', 'Shea Butter', 'SPF 30'],
    benefits: [
      'Heals cracked lips',
      'Wind protection',
      'Long-lasting moisture',
      'Sun protection',
    ],
    price: 28,
    category: 'Skincare',
  },
  {
    id: 'prod-005',
    name: 'Peak Performance Recovery Soak',
    description:
      'A mineral-rich bath soak designed for serious athletes. Combines therapeutic salts and essential oils to accelerate recovery after demanding mountain days.',
    keyIngredients: ['Epsom Salt', 'Dead Sea Salt', 'Arnica', 'Peppermint', 'Magnesium'],
    benefits: [
      'Muscle relaxation',
      'Reduces inflammation',
      'Detoxifying minerals',
      'Mental relaxation',
    ],
    price: 54,
    category: 'Recovery',
  },
  {
    id: 'prod-006',
    name: 'Frostbite Defense Hand Cream',
    description:
      'Ultra-rich hand cream that protects and repairs hands exposed to freezing temperatures and harsh glove friction. Non-greasy formula absorbs quickly.',
    keyIngredients: ['Shea Butter', 'Glycerin', 'Oat Extract', 'Vitamin B5', 'Beeswax'],
    benefits: [
      'Extreme cold protection',
      'Crack and split repair',
      'Non-greasy absorption',
      'All-day moisture barrier',
    ],
    price: 38,
    category: 'Skincare',
  },
];

/**
 * Validate that required environment variables are set
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = ['ANTHROPIC_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get social media handles from config
 */
export function getSocialHandles(): Record<string, string> {
  return {
    instagram: process.env.INSTAGRAM_HANDLE || '@apresfeels',
    tiktok: process.env.TIKTOK_HANDLE || '@apresfeels',
    facebook: process.env.FACEBOOK_PAGE || 'ApresFeels',
    pinterest: process.env.PINTEREST_HANDLE || 'apresfeels',
  };
}

/**
 * Get content themes from config
 */
export function getContentThemes(): string[] {
  const themes =
    process.env.CONTENT_THEMES ||
    'ski culture,ski travel,après scenes and parties,ski fitness,ski recovery,ski athletes and influencers,ski destinations and resorts,ski events,ski fashion,ski movies and media,skincare principles,natural healing,natural ingredients';
  return themes.split(',').map((t) => t.trim());
}
