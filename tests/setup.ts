import { config } from 'dotenv';
import { vi } from 'vitest';

// Load environment variables for tests
config();

// Mock external API calls by default
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"test": "response"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateImages: vi.fn().mockResolvedValue({
        generatedImages: [{ image: { imageBytes: 'base64data' } }],
      }),
      generateVideos: vi.fn().mockResolvedValue({
        done: true,
        response: {
          generatedVideos: [{ video: { uri: 'https://example.com/video.mp4' } }],
        },
      }),
    },
    operations: {
      getVideosOperation: vi.fn(),
    },
  })),
}));
