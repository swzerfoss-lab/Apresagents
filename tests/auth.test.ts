import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import workflowListHandler from '../api/workflow/list.js';
import { requireAdminAuth, shouldRequireAdminAuth } from '../src/middleware/auth.js';

const ORIGINAL_ENV = { ...process.env };

interface MockVercelResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string | string[] | number>;
  status: (code: number) => MockVercelResponse;
  json: (body: unknown) => MockVercelResponse;
  setHeader: (name: string, value: string | string[] | number) => MockVercelResponse;
}

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ADMIN_API_TOKEN;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  process.env.NODE_ENV = 'test';
}

function createProtectedApp() {
  const app = express();
  app.use(requireAdminAuth);
  app.get('/protected', (_req, res) => {
    res.json({ success: true });
  });
  return app;
}

function createMockVercelResponse(): MockVercelResponse {
  const response: MockVercelResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
    setHeader(name: string, value: string | string[] | number) {
      response.headers[name.toLowerCase()] = value;
      return response;
    },
  };

  return response;
}

describe('admin authentication middleware', () => {
  afterEach(() => {
    resetEnv();
  });

  it('does not require admin credentials for explicit local/test development by default', () => {
    resetEnv();

    expect(shouldRequireAdminAuth()).toBe(false);

    process.env.NODE_ENV = 'development';

    expect(shouldRequireAdminAuth()).toBe(false);
  });

  it('fails closed when the runtime environment is not explicitly local', async () => {
    resetEnv();
    delete process.env.NODE_ENV;

    expect(shouldRequireAdminAuth()).toBe(true);

    const res = await request(createProtectedApp()).get('/protected');

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('not configured');
  });

  it('rejects protected routes when production auth is not configured', async () => {
    resetEnv();
    process.env.NODE_ENV = 'production';

    const res = await request(createProtectedApp()).get('/protected');

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('not configured');
  });

  it('rejects requests without configured admin credentials', async () => {
    resetEnv();
    process.env.ADMIN_API_TOKEN = 'super-secret';

    const res = await request(createProtectedApp()).get('/protected');

    expect(res.status).toBe(401);
  });

  it('accepts a matching bearer admin token', async () => {
    resetEnv();
    process.env.ADMIN_API_TOKEN = 'super-secret';

    const res = await request(createProtectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer super-secret');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('accepts matching basic admin credentials', async () => {
    resetEnv();
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'super-secret';

    const res = await request(createProtectedApp())
      .get('/protected')
      .auth('admin', 'super-secret');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects unauthenticated Vercel workflow list requests in production', async () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_API_TOKEN = 'super-secret';

    const req = { method: 'GET', headers: {} };
    const res = createMockVercelResponse();

    await workflowListHandler(req as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(res.headers['www-authenticate']).toBe('Basic realm="Apres Feels Admin"');
  });
});
