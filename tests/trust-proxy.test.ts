import { describe, expect, it, afterEach } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import {
  applyTrustProxy,
  resolveTrustProxySetting,
} from '../src/middleware/trustProxy.js';

describe('resolveTrustProxySetting', () => {
  it('trusts one hop on Render and Vercel by default', () => {
    expect(resolveTrustProxySetting({ RENDER: 'true' })).toBe(1);
    expect(resolveTrustProxySetting({ VERCEL: '1' })).toBe(1);
  });

  it('allows explicit override and disable', () => {
    expect(resolveTrustProxySetting({ TRUST_PROXY: '1' })).toBe(1);
    expect(resolveTrustProxySetting({ TRUST_PROXY: '2', RENDER: 'true' })).toBe(2);
    expect(resolveTrustProxySetting({ TRUST_PROXY: '0', RENDER: 'true' })).toBe(false);
    expect(resolveTrustProxySetting({})).toBe(false);
  });
});

describe('rate limit client isolation behind a proxy', () => {
  const servers: Array<ReturnType<typeof express.application.listen>> = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          })
      )
    );
  });

  function buildApp(trustProxy: boolean) {
    const app = express();
    if (trustProxy) {
      applyTrustProxy(app, { TRUST_PROXY: '1' });
    }

    // Keep validation quiet in unit tests; the regression is the shared bucket.
    app.use(
      '/api/',
      rateLimit({
        windowMs: 60_000,
        max: 3,
        message: { error: 'limited' },
        validate: false,
      })
    );
    app.get('/api/health', (_req, res) => {
      res.json({ ok: true });
    });
    app.get('/api/workflow/list', (_req, res) => {
      res.json({ ok: true });
    });

    return app;
  }

  it('without trust proxy, public health traffic exhausts the shared bucket for other clients', async () => {
    const app = buildApp(false);
    const server = app.listen(0);
    servers.push(server);

    for (let i = 0; i < 3; i += 1) {
      await request(server)
        .get('/api/health')
        .set('X-Forwarded-For', `9.9.9.${i}`)
        .expect(200);
    }

    await request(server)
      .get('/api/workflow/list')
      .set('X-Forwarded-For', '1.1.1.1')
      .expect(429);
  });

  it('with trust proxy, health floods do not rate-limit a different client IP', async () => {
    const app = buildApp(true);
    const server = app.listen(0);
    servers.push(server);

    for (let i = 0; i < 3; i += 1) {
      await request(server)
        .get('/api/health')
        .set('X-Forwarded-For', `9.9.9.${i}`)
        .expect(200);
    }

    await request(server)
      .get('/api/workflow/list')
      .set('X-Forwarded-For', '1.1.1.1')
      .expect(200);
  });
});
