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
    const fetchMock = vi.fn().mockResolvedValue(new Response('expired', { status: 403, statusText: 'Forbidden' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Video generated but could not be saved locally');
    expect(result.error).toContain('403 Forbidden');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/expired-video.mp4',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await expect(readdir(outputDirectory)).resolves.toEqual([]);
  });

  it('fails when a URL-backed generated video download times out', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      uri: 'https://example.com/stalled-video.mp4',
      mimeType: 'video/mp4',
    });
    const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    const fetchMock = vi.fn().mockRejectedValue(timeoutError);
    vi.stubGlobal('fetch', fetchMock);

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Video generated but could not be saved locally');
    expect(result.error).toMatch(/aborted|timeout/i);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/stalled-video.mp4',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await expect(readdir(outputDirectory)).resolves.toEqual([]);
  });

  it('saves a URL-backed generated video before returning success', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      uri: 'https://example.com/generated-video.mp4',
      mimeType: 'video/mp4',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('valid video bytes', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(true);
    expect(result.data?.filePath).toMatch(/^.+apresfeels_video_\d+_[0-9a-f-]+\.mp4$/);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/generated-video.mp4',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await expect(readFile(result.data!.filePath!, 'utf-8')).resolves.toBe('valid video bytes');
  });

  it('uses unique filenames for concurrent saves in the same millisecond', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      videoBytes: Buffer.from('valid video bytes').toString('base64'),
      mimeType: 'video/mp4',
    });
    vi.spyOn(Date, 'now').mockReturnValue(1760000000000);

    const results = await Promise.all([
      agent.generateVideo('first ski recovery product shot', { outputDirectory }),
      agent.generateVideo('second ski recovery product shot', { outputDirectory }),
    ]);

    const filePaths = results.map((result) => result.data?.filePath);
    expect(results.every((result) => result.success)).toBe(true);
    expect(new Set(filePaths).size).toBe(2);
    expect(await readdir(outputDirectory)).toHaveLength(2);
  });
});
