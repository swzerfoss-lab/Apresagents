import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ContentStorage } from '../../src/storage/ContentStorage';
import {
  adminAuthConfigured,
  hasValidAdminCredentialFromHeaders,
  shouldRequireAdminAuth,
} from '../../src/middleware/auth';

const storage = new ContentStorage();

function requestHeader(req: VercelRequest, name: string): string | string[] | undefined {
  return req.headers[name.toLowerCase()];
}

function requireVercelAdminAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (!shouldRequireAdminAuth()) {
    return true;
  }

  if (!adminAuthConfigured()) {
    res.status(503).json({ error: 'Admin authentication is not configured' });
    return false;
  }

  if (!hasValidAdminCredentialFromHeaders((name) => requestHeader(req, name))) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Apres Feels Admin"');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireVercelAdminAuth(req, res)) {
    return;
  }

  try {
    const workflows = await storage.getAllWorkflows();
    res.status(200).json({
      success: true,
      workflows: workflows.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
}
