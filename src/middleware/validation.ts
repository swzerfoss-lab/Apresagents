/**
 * Request validation middleware using Zod
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Valid platform values
const SocialPlatformSchema = z.enum(['instagram', 'tiktok', 'facebook', 'pinterest']);

// Workflow trigger request
export const WorkflowTriggerSchema = z.object({
  platforms: z.array(SocialPlatformSchema).min(1, 'At least one platform is required'),
  postsPerPlatform: z.number().int().min(1).max(10).optional().default(3),
  skipVideoGeneration: z.boolean().optional().default(false),
  skipImageGeneration: z.boolean().optional().default(false),
});

// Content generation request
export const ContentGenerateSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  platforms: z.array(SocialPlatformSchema).min(1, 'At least one platform is required'),
  productId: z.string().optional(),
});

// Image render request
export const ImageRenderSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:5']).optional().default('1:1'),
  style: z.string().optional(),
});

// Video render request
export const VideoRenderSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  duration: z.number().int().min(5).max(8).optional().default(8),
  aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
});

// Content edit request
export const ContentEditSchema = z.object({
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  callToAction: z.string().optional(),
});

// Post status update
export const PostStatusSchema = z.object({
  status: z.enum(['draft', 'ready', 'approved', 'published', 'failed']),
});

// Validation middleware factory
export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      req.body = result.data;
      next();
    } catch (_error) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
  };
}

// Validate URL params
export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const errors = result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'Invalid parameters',
          details: errors,
        });
      }
      req.params = result.data as typeof req.params;
      next();
    } catch (_error) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
  };
}
