import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ContentStorage } from '../../src/storage/ContentStorage';

const storage = new ContentStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
