import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
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

describe('VideoContentAgent.generateVideo config', () => {
  it('passes generateAudio to the Veo SDK (not the invalid includeAudio key)', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      videoBytes: Buffer.from('valid video bytes').toString('base64'),
      mimeType: 'video/mp4',
    });
    const generateVideos = (
      agent as unknown as {
        genAI: { models: { generateVideos: ReturnType<typeof vi.fn> } };
      }
    ).genAI.models.generateVideos;

    const withAudioResult = await agent.generateVideo('recovery ritual with sound', {
      outputDirectory,
      withAudio: true,
    });
    const withoutAudioResult = await agent.generateVideo('silent product loop', {
      outputDirectory,
      withAudio: false,
    });

    expect(withAudioResult.success).toBe(true);
    expect(withoutAudioResult.success).toBe(true);
    expect(generateVideos).toHaveBeenCalledTimes(2);

    const withAudioConfig = generateVideos.mock.calls[0]?.[0]?.config as Record<string, unknown>;
    const withoutAudioConfig = generateVideos.mock.calls[1]?.[0]?.config as Record<string, unknown>;

    expect(withAudioConfig).toMatchObject({ generateAudio: true });
    expect(withAudioConfig).not.toHaveProperty('includeAudio');
    expect(withoutAudioConfig).toMatchObject({ generateAudio: false });
    expect(withoutAudioConfig).not.toHaveProperty('includeAudio');
  });

  it('bounds generateVideos and getVideosOperation with per-call timeouts', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      videoBytes: Buffer.from('valid video bytes').toString('base64'),
      mimeType: 'video/mp4',
    });
    const genAI = (
      agent as unknown as {
        genAI: {
          models: { generateVideos: ReturnType<typeof vi.fn> };
          operations: { getVideosOperation: ReturnType<typeof vi.fn> };
        };
      }
    ).genAI;

    genAI.models.generateVideos.mockResolvedValue({
      done: false,
      name: 'operations/test-veo-op',
    });
    genAI.operations.getVideosOperation.mockResolvedValue({
      done: true,
      name: 'operations/test-veo-op',
      response: {
        generatedVideos: [
          {
            video: {
              videoBytes: Buffer.from('valid video bytes').toString('base64'),
              mimeType: 'video/mp4',
            },
          },
        ],
      },
    });

    vi.useFakeTimers();
    const resultPromise = agent.generateVideo('bounded poll', { outputDirectory });
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.success).toBe(true);

    const generateConfig = genAI.models.generateVideos.mock.calls[0]?.[0]?.config as {
      httpOptions?: { timeout?: number };
      abortSignal?: AbortSignal;
    };
    expect(generateConfig.httpOptions?.timeout).toBe(120_000);
    expect(generateConfig.abortSignal).toBeInstanceOf(AbortSignal);

    const pollArgs = genAI.operations.getVideosOperation.mock.calls[0]?.[0] as {
      config?: { httpOptions?: { timeout?: number }; abortSignal?: AbortSignal };
    };
    expect(pollArgs.config?.httpOptions?.timeout).toBe(60_000);
    expect(pollArgs.config?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('fails when the Veo operation completes with an error payload', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      videoBytes: Buffer.from('valid video bytes').toString('base64'),
      mimeType: 'video/mp4',
    });
    const generateVideos = (
      agent as unknown as {
        genAI: { models: { generateVideos: ReturnType<typeof vi.fn> } };
      }
    ).genAI.models.generateVideos;

    generateVideos.mockResolvedValue({
      done: true,
      name: 'operations/failed-veo-op',
      error: { message: 'Safety filter blocked generation' },
      response: { generatedVideos: [] },
    });

    const result = await agent.generateVideo('blocked prompt', { outputDirectory });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Safety filter blocked generation');
  });
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

  it('fails when a URL-backed download returns an empty body', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      uri: 'https://example.com/empty-video.mp4',
      mimeType: 'video/mp4',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Downloaded video was empty');
    await expect(readdir(outputDirectory)).resolves.toEqual([]);
  });

  it('authenticates Gemini file URI downloads with the API key', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const outputDirectory = await createTempDir();
    const uri = 'https://generativelanguage.googleapis.com/v1beta/files/abc123:download?alt=media';
    const agent = createVideoAgent({
      uri,
      mimeType: 'video/mp4',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('gemini-video-bytes', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [downloadedUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(downloadedUrl).toBe(`${uri}&key=test-gemini-key`);
      expect(init.headers).toEqual({ 'x-goog-api-key': 'test-gemini-key' });
      await expect(readFile(result.data!.filePath!, 'utf-8')).resolves.toBe('gemini-video-bytes');
    } finally {
      if (previousKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousKey;
      }
    }
  });

  it('uses the SDK files.download helper for URI-backed Veo results when available', async () => {
    const outputDirectory = await createTempDir();
    const video = {
      uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc123:download?alt=media',
      mimeType: 'video/mp4',
    };
    const agent = createVideoAgent(video);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const download = vi.fn().mockImplementation(async ({ downloadPath }: { downloadPath: string }) => {
      await writeFile(downloadPath, 'sdk-downloaded-bytes');
    });
    (
      agent as unknown as {
        genAI: { files: { download: ReturnType<typeof vi.fn> } };
      }
    ).genAI.files = { download };

    const result = await agent.generateVideo('ski recovery product shot', { outputDirectory });

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledWith({
      file: video,
      downloadPath: result.data?.filePath,
    });
    await expect(readFile(result.data!.filePath!, 'utf-8')).resolves.toBe('sdk-downloaded-bytes');
  });

  it('persists URI-backed clips as clip_N files in generateFullVideo', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVideoAgent({
      uri: 'https://example.com/generated-video.mp4',
      mimeType: 'video/mp4',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('clip-one-bytes', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await agent.generateFullVideo(
      {
        title: 'Alpine Recovery',
        hook: 'hook',
        narrative: 'narrative',
        scenes: [],
        visualStyle: 'cinematic',
        audioDirection: 'ambient',
        callToAction: 'shop',
        platform: 'instagram',
        duration: '15s',
        veoPrompt: 'legacy',
        totalDuration: 15,
        clips: [
          {
            clipNumber: 1,
            duration: 8,
            veoPrompt: 'skier carving powder',
            description: 'action',
          },
        ],
      },
      { outputDirectory }
    );

    expect(result.success).toBe(true);
    expect(result.data?.clips).toHaveLength(1);
    expect(result.data?.clips[0]?.filePath).toMatch(/clip_1_\d+\.mp4$/);
    await expect(readFile(result.data!.clips[0]!.filePath!, 'utf-8')).resolves.toBe('clip-one-bytes');
    const names = await readdir(outputDirectory);
    expect(names.some((name) => name.startsWith('clip_1_'))).toBe(true);
    expect(names.some((name) => name.startsWith('apresfeels_video_'))).toBe(false);
  });
});
