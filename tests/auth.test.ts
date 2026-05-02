import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { requireAdminAuth, shouldRequireAdminAuth } from '../src/middleware/auth.js';

const ORIGINAL_ENV = { ...process.env };

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

describe('admin authentication middleware', () => {
  afterEach(() => {
    resetEnv();
  });

  it('does not require admin credentials for local/test development by default', () => {
    resetEnv();

    expect(shouldRequireAdminAuth()).toBe(false);
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
});
