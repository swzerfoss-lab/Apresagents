/**
 * Resolve Express `trust proxy` for deployments behind a reverse proxy.
 *
 * Without this, `req.ip` is the proxy address, so express-rate-limit shares one
 * bucket across all clients. A flood of public `/api/health` requests can then
 * 429 every user.
 */
export function resolveTrustProxySetting(
  env: NodeJS.ProcessEnv = process.env
): number | false {
  const raw = env.TRUST_PROXY?.trim();
  if (raw === '0' || raw === 'false') {
    return false;
  }
  if (raw === '1' || raw === 'true') {
    return 1;
  }
  if (raw) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber) && asNumber >= 0) {
      return asNumber;
    }
  }

  // Render and Vercel terminate TLS and forward the client via X-Forwarded-For.
  if (env.RENDER || env.VERCEL) {
    return 1;
  }

  return false;
}

export function applyTrustProxy(
  app: { set(name: string, value: unknown): unknown },
  env: NodeJS.ProcessEnv = process.env
): number | false {
  const setting = resolveTrustProxySetting(env);
  if (setting !== false) {
    app.set('trust proxy', setting);
  }
  return setting;
}
