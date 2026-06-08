import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VideoContentAgent } from './VideoContentAgent.js';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'video-content-agent-'));
  tempDirs.push(dir);
  return dir;
}

function createVideoAgent(videoResponse: Record<string, unknown>): VideoContentAgent {
  const agent = Object.create(VideoContentAgent.prototype) as VideoContentAgent;
  const testAgent = agent as unknown as {
    genAI: {
      models: {
        generateVideos: ReturnType<typeof vi.fn>;
      };
      operations: {
        getVideosOperation: ReturnType<typeof vi.fn>;
      };
    };
    videoModelName: string;
    fastVideoModelName: string;
  };

  testAgent.genAI = {
    models: {
      generateVideos: vi.fn().mockResolvedValue({
        done: true,
        response: {
          generatedVideos: [{ video: videoResponse }],
        },
      }),
    },
    operations: {
      getVideosOperation: vi.fn(),
    },
  };
  testAgent.videoModelName = 'test-video-model';
  testAgent.fastVideoModelName = 'test-fast-video-model';

  return agent;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('VideoContentAgent.generateVideo local persistence', () => {
  it('fails when a URL-backed generated video cannot be downloaded', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      uri: 'https://example.com/expired-video.mp4',
      mimeType: 'video/mp4',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('expired', { status: 403, statusText: 'Forbidden' }))
    );

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Video generated but could not be saved locally');
    expect(result.error).toContain('403 Forbidden');
    await expect(readdir(outputDirectory)).resolves.toEqual([]);
  });

  it('saves a URL-backed generated video before returning success', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      uri: 'https://example.com/generated-video.mp4',
      mimeType: 'video/mp4',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('valid video bytes', { status: 200 }))
    );

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(true);
    expect(result.data?.filePath).toMatch(/^.+apresfeels_video_\d+\.mp4$/);
    await expect(readFile(result.data!.filePath!, 'utf-8')).resolves.toBe('valid video bytes');
  });
});
