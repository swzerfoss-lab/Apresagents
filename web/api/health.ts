import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'Apres Feels Content Portal API',
    agents: {
      manager: 'ready',
      video: process.env.GEMINI_API_KEY ? 'ready' : 'no-api-key',
      strategy: 'ready',
      brandVoice: 'ready',
    },
  });
}
