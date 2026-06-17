import type { VercelRequest, VercelResponse } from '@vercel/node';

const brandConfig = {
  name: 'Apres Feels',
  description: 'Premium winter sports recovery and skincare brand',
  tagline: 'Premium Recovery for Mountain Athletes',
  website: 'apresfeels.com',
  targetAudience: 'Winter sports enthusiasts aged 28-55',
  tone: ['Premium', 'Adventurous', 'Fun', 'Luxurious', 'Work Hard Play Hard'],
  contentThemes: [
    'Ski culture and mountain lifestyle',
    'International ski destinations',
    'Après-ski social scenes',
    'Mountain recovery rituals',
    'Premium self-care',
    'Athletic performance',
  ],
};

const products = [
  {
    id: 'alpine-recovery-balm',
    name: 'Alpine Recovery Muscle Balm',
    description: 'Deep-penetrating muscle relief with alpine botanicals',
    keyIngredients: ['Arnica', 'Eucalyptus', 'Alpine Herbs', 'CBD'],
    benefits: ['Soothes sore muscles', 'Reduces inflammation', 'Speeds recovery'],
    price: 48,
    category: 'muscle-care',
  },
  {
    id: 'summit-shield-cream',
    name: 'Summit Shield Face Cream',
    description: 'Protective face cream for extreme mountain conditions',
    keyIngredients: ['Edelweiss Extract', 'Vitamin E', 'Shea Butter', 'SPF 30'],
    benefits: ['Wind protection', 'UV defense', 'Deep hydration'],
    price: 65,
    category: 'face-care',
  },
  {
    id: 'apres-glow-oil',
    name: 'Après Glow Body Oil',
    description: 'Luxurious body oil for post-adventure skin restoration',
    keyIngredients: ['Argan Oil', 'Rosehip', 'Vitamin C', 'Gold Flakes'],
    benefits: ['Intense moisture', 'Skin radiance', 'Anti-aging'],
    price: 52,
    category: 'body-care',
  },
  {
    id: 'powder-day-lip',
    name: 'Powder Day Lip Treatment',
    description: 'Intensive lip repair for cold weather exposure',
    keyIngredients: ['Beeswax', 'Lanolin', 'Peppermint', 'SPF 25'],
    benefits: ['Heals chapped lips', 'Long-lasting protection', 'Cooling sensation'],
    price: 24,
    category: 'lip-care',
  },
  {
    id: 'peak-recovery-soak',
    name: 'Peak Performance Recovery Soak',
    description: 'Mineral-rich bath soak for total body recovery',
    keyIngredients: ['Epsom Salt', 'Dead Sea Minerals', 'Lavender', 'Magnesium'],
    benefits: ['Muscle relaxation', 'Stress relief', 'Better sleep'],
    price: 38,
    category: 'bath-body',
  },
  {
    id: 'frostbite-defense-hand',
    name: 'Frostbite Defense Hand Cream',
    description: 'Heavy-duty hand cream for extreme cold protection',
    keyIngredients: ['Glycerin', 'Ceramides', 'Allantoin', 'Vitamin B5'],
    benefits: ['Crack healing', 'Cold protection', 'Non-greasy formula'],
    price: 28,
    category: 'hand-care',
  },
];

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    brand: brandConfig,
    products,
  });
}
