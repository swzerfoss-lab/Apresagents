/**
 * Admin authentication for APIs that mutate workflows or spend model quota.
 */

import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

type HeaderValue = string | string[] | undefined;
type HeaderReader = (name: string) => HeaderValue;

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

export function adminAuthConfigured(): boolean {
  return Boolean(
    readEnv('ADMIN_API_TOKEN') ||
    (readEnv('ADMIN_USERNAME') && readEnv('ADMIN_PASSWORD'))
  );
}

function isLocalOrTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

export function shouldRequireAdminAuth(): boolean {
  if (adminAuthConfigured()) {
    return true;
  }

  return !isLocalOrTestEnvironment();
}

function firstHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function bearerToken(authHeader: string | undefined): string | undefined {
  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer') {
    return undefined;
  }

  return token;
}

function basicCredentials(authHeader: string | undefined): { username: string; password: string } | undefined {
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

export function hasValidAdminCredentialFromHeaders(getHeader: HeaderReader): boolean {
  const authorization = firstHeaderValue(getHeader('authorization'));
  const expectedToken = readEnv('ADMIN_API_TOKEN');
  const suppliedToken = firstHeaderValue(getHeader('x-admin-token')) || bearerToken(authorization);

  if (safeEquals(suppliedToken, expectedToken)) {
    return true;
  }

  const expectedUsername = readEnv('ADMIN_USERNAME');
  const expectedPassword = readEnv('ADMIN_PASSWORD');
  const suppliedCredentials = basicCredentials(authorization);

  return Boolean(
    suppliedCredentials &&
    safeEquals(suppliedCredentials.username, expectedUsername) &&
    safeEquals(suppliedCredentials.password, expectedPassword)
  );
}

function hasValidAdminCredential(req: Request): boolean {
  return hasValidAdminCredentialFromHeaders((name) => req.get(name));
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
