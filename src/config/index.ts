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
    'Premium skincare brand focused on natural ingredients and self-care rituals';
  const toneStr = process.env.BRAND_TONE || 'warm, approachable, luxurious yet accessible, empowering';
  const targetAudience =
    process.env.BRAND_TARGET_AUDIENCE ||
    'Women 25-45 interested in self-care, natural beauty, and wellness';

  return {
    name,
    description,
    tone: toneStr.split(',').map((t) => t.trim()),
    targetAudience,
    keywords: process.env.BRAND_KEYWORDS?.split(',').map((k) => k.trim()),
  };
}

/**
 * Default products for demonstration
 */
export const sampleProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Hydra Glow Serum',
    description:
      'A lightweight, fast-absorbing hyaluronic acid serum that delivers intense hydration for a dewy, plump complexion.',
    keyIngredients: ['Hyaluronic Acid', 'Vitamin B5', 'Niacinamide', 'Aloe Vera'],
    benefits: [
      'Deep hydration',
      'Plumps fine lines',
      'Improves skin texture',
      'Suitable for all skin types',
    ],
    price: 48,
    category: 'Serums',
  },
  {
    id: 'prod-002',
    name: 'Vitamin C Brightening Elixir',
    description:
      'A potent vitamin C serum that brightens skin tone, fades dark spots, and protects against environmental damage.',
    keyIngredients: ['20% Vitamin C', 'Vitamin E', 'Ferulic Acid', 'Green Tea Extract'],
    benefits: [
      'Brightens skin',
      'Fades dark spots',
      'Antioxidant protection',
      'Evens skin tone',
    ],
    price: 65,
    category: 'Serums',
  },
  {
    id: 'prod-003',
    name: 'Gentle Cloud Cleanser',
    description:
      'A creamy, pH-balanced cleanser that removes makeup and impurities while maintaining the skin barrier.',
    keyIngredients: ['Ceramides', 'Centella Asiatica', 'Glycerin', 'Chamomile'],
    benefits: [
      'Gentle cleansing',
      'Preserves skin barrier',
      'Removes makeup',
      'Calms sensitive skin',
    ],
    price: 32,
    category: 'Cleansers',
  },
  {
    id: 'prod-004',
    name: 'Overnight Repair Mask',
    description:
      'A rich, restorative sleeping mask that works overnight to repair and rejuvenate tired, stressed skin.',
    keyIngredients: ['Retinol', 'Peptides', 'Squalane', 'Bakuchiol'],
    benefits: [
      'Overnight repair',
      'Reduces fine lines',
      'Improves firmness',
      'Wake up glowing',
    ],
    price: 58,
    category: 'Masks',
  },
  {
    id: 'prod-005',
    name: 'Daily Defense SPF 50',
    description:
      'A lightweight, non-greasy mineral sunscreen that provides broad-spectrum protection without white cast.',
    keyIngredients: ['Zinc Oxide', 'Vitamin E', 'Green Tea', 'Hyaluronic Acid'],
    benefits: [
      'SPF 50 protection',
      'No white cast',
      'Hydrating formula',
      'Works under makeup',
    ],
    price: 42,
    category: 'Sun Protection',
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
    'skincare routines,ingredient spotlights,self-care tips,behind the scenes,customer stories';
  return themes.split(',').map((t) => t.trim());
}
