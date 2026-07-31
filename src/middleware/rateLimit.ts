/**
 * Rate limiting middleware for API protection
 */

import rateLimit from 'express-rate-limit';

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Expensive operations (AI generation) - more restrictive
export const generationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 generation requests per minute
  message: { error: 'Generation rate limit exceeded, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Workflow trigger - very restrictive
export const workflowLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 workflow triggers per 5 minutes
  message: { error: 'Workflow rate limit exceeded, please wait before triggering another workflow' },
  standardHeaders: true,
  legacyHeaders: false,
});
