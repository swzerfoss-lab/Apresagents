/**
 * Core types for the Apresagents social media content system
 */

// Platform types
export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook' | 'pinterest';

// Content types
export type ContentType =
  | 'post'
  | 'story'
  | 'reel'
  | 'carousel'
  | 'video'
  | 'pin'
  | 'ad';

export type ContentCategory =
  | 'product-highlight'
  | 'ingredient-spotlight'
  | 'skincare-routine'
  | 'self-care-tips'
  | 'behind-the-scenes'
  | 'customer-story'
  | 'educational'
  | 'promotional'
  | 'seasonal'
  | 'trending';

// Brand configuration
export interface BrandConfig {
  name: string;
  description: string;
  tone: string[];
  targetAudience: string;
  products?: Product[];
  colorPalette?: string[];
  keywords?: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  keyIngredients: string[];
  benefits: string[];
  price: number;
  category: string;
}

// Content generation
export interface ContentRequest {
  platform: SocialPlatform;
  contentType: ContentType;
  category: ContentCategory;
  product?: Product;
  theme?: string;
  tone?: string;
  targetAudience?: string;
  additionalContext?: string;
}

export interface GeneratedContent {
  id: string;
  platform: SocialPlatform;
  contentType: ContentType;
  category: ContentCategory;
  caption: string;
  hashtags: string[];
  callToAction?: string;
  visualDescription: string;
  visualPrompt: string;
  suggestedPostTime?: string;
  alternativeVersions?: string[];
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  createdAt: Date;
  agentUsed: string;
  estimatedEngagement?: string;
  targetDemographic?: string;
  seasonalRelevance?: string;
}

// Ad Campaign types
export interface AdCampaignRequest {
  objective: CampaignObjective;
  platforms: SocialPlatform[];
  budget?: number;
  duration?: number;
  product?: Product;
  targetAudience?: AudienceTargeting;
  theme?: string;
}

export type CampaignObjective =
  | 'awareness'
  | 'engagement'
  | 'traffic'
  | 'conversions'
  | 'sales';

export interface AudienceTargeting {
  ageRange: [number, number];
  gender?: 'all' | 'female' | 'male';
  interests: string[];
  behaviors?: string[];
  locations?: string[];
}

export interface AdCampaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  platforms: SocialPlatform[];
  ads: AdCreative[];
  targetAudience: AudienceTargeting;
  suggestedBudgetAllocation?: Record<SocialPlatform, number>;
  estimatedReach?: string;
  recommendations: string[];
}

export interface AdCreative {
  platform: SocialPlatform;
  format: ContentType;
  headline: string;
  primaryText: string;
  callToAction: string;
  visualDescription: string;
  visualPrompt: string;
  targetingNotes: string;
}

// Content Calendar
export interface ContentCalendarRequest {
  startDate: Date;
  endDate: Date;
  platforms: SocialPlatform[];
  postsPerWeek: number;
  themes?: ContentCategory[];
  products?: Product[];
}

export interface ContentCalendar {
  id: string;
  startDate: Date;
  endDate: Date;
  entries: CalendarEntry[];
  summary: CalendarSummary;
}

export interface CalendarEntry {
  date: Date;
  dayOfWeek: string;
  platform: SocialPlatform;
  contentType: ContentType;
  category: ContentCategory;
  theme: string;
  briefDescription: string;
  suggestedTime: string;
  content?: GeneratedContent;
}

export interface CalendarSummary {
  totalPosts: number;
  postsByPlatform: Record<SocialPlatform, number>;
  postsByCategory: Record<string, number>;
  keyThemes: string[];
  recommendations: string[];
}

// Agent types
export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Strategy types
export interface ContentStrategy {
  overallTheme: string;
  weeklyFocus: WeeklyFocus[];
  contentPillars: ContentPillar[];
  campaignIdeas: CampaignIdea[];
  trendOpportunities: TrendOpportunity[];
}

export interface WeeklyFocus {
  week: number;
  theme: string;
  goals: string[];
  keyMessages: string[];
}

export interface ContentPillar {
  name: string;
  description: string;
  postFrequency: string;
  exampleTopics: string[];
}

export interface CampaignIdea {
  name: string;
  description: string;
  timing: string;
  platforms: SocialPlatform[];
  estimatedImpact: string;
}

export interface TrendOpportunity {
  trend: string;
  relevance: string;
  suggestedContent: string;
  urgency: 'high' | 'medium' | 'low';
}

// Video content types
export interface VideoGenerationRequest {
  topic: string;
  platform: SocialPlatform;
  duration: '15s' | '30s' | '60s';
  style?: 'cinematic' | 'documentary' | 'dynamic' | 'lifestyle' | 'commercial';
  product?: Product;
  outputDirectory?: string;
}

export interface GeneratedVideoContent {
  id: string;
  title: string;
  platform: SocialPlatform;
  duration: string;
  concept: {
    hook: string;
    narrative: string;
    visualStyle: string;
    audioDirection: string;
    callToAction: string;
  };
  scenes: Array<{
    sceneNumber: number;
    timestamp: string;
    visual: string;
    action: string;
    text?: string;
    audio?: string;
  }>;
  veoPrompt: string;
  videoUrl?: string;
  videoFilePath?: string;
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  createdAt: Date;
  agentUsed: string;
  resolution: string;
  aspectRatio: string;
  hasAudio: boolean;
  modelUsed: string;
}

export interface VideoCampaign {
  id: string;
  name: string;
  theme: string;
  videos: GeneratedVideoContent[];
  releaseSchedule: Array<{
    week: number;
    videoId: string;
    platform: SocialPlatform;
    suggestedDate?: string;
  }>;
  totalDuration: string;
  platforms: SocialPlatform[];
}
