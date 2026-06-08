/**
 * Admin authentication for APIs that mutate workflows or spend model quota.
 */

import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function safeEquals(actual: string | undefined, expected: string | undefined): boolean {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function adminAuthConfigured(): boolean {
  return Boolean(
    readEnv('ADMIN_API_TOKEN') ||
    (readEnv('ADMIN_USERNAME') && readEnv('ADMIN_PASSWORD'))
  );
}

export function shouldRequireAdminAuth(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return adminAuthConfigured();
}

function bearerToken(req: Request): string | undefined {
  const authHeader = req.get('authorization');
  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer') {
    return undefined;
  }

  return token;
}

function basicCredentials(req: Request): { username: string; password: string } | undefined {
  const authHeader = req.get('authorization');
  if (!authHeader) {
    return undefined;
  }

  const [scheme, encoded] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'basic' || !encoded) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      return undefined;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return undefined;
  }
}

function hasValidAdminCredential(req: Request): boolean {
  const expectedToken = readEnv('ADMIN_API_TOKEN');
  const suppliedToken = req.get('x-admin-token') || bearerToken(req);

  if (safeEquals(suppliedToken, expectedToken)) {
    return true;
  }

  const expectedUsername = readEnv('ADMIN_USERNAME');
  const expectedPassword = readEnv('ADMIN_PASSWORD');
  const suppliedCredentials = basicCredentials(req);

  return Boolean(
    suppliedCredentials &&
    safeEquals(suppliedCredentials.username, expectedUsername) &&
    safeEquals(suppliedCredentials.password, expectedPassword)
  );
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!shouldRequireAdminAuth()) {
    return next();
  }

  if (!adminAuthConfigured()) {
    return res.status(503).json({
      error: 'Admin authentication is not configured',
    });
  }

  if (!hasValidAdminCredential(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Apres Feels Admin"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}
