import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    agents: {
      manager: 'ready',
      video: 'ready',
      strategy: 'ready',
      brandVoice: 'ready',
      workflowOrchestrator: 'ready'
    }
  });
}
