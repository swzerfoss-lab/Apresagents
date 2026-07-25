import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { persistGeneratedClip } from '../src/utils/videoPersistence.js';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'video-persistence-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('persistGeneratedClip', () => {
  it('uses an already downloaded file path for URL-backed video results', async () => {
    const outputDir = await createTempDir();
    const video = { filePath: path.join(outputDir, 'apresfeels_video.mp4') };

    expect(persistGeneratedClip(video, 1, outputDir, 123)).toBe(video.filePath);
  });

  it('writes base64 video bytes when no file path is present', async () => {
    const outputDir = await createTempDir();
    const video = { videoData: Buffer.from('clip bytes').toString('base64') };

    const filePath = persistGeneratedClip(video, 2, outputDir, 123);

    expect(filePath).toBe(path.join(outputDir, 'clip_2_123.mp4'));
    await expect(readFile(filePath!, 'utf-8')).resolves.toBe('clip bytes');
    expect(video.filePath).toBe(filePath);
  });

  it('returns undefined when a clip has no local file or inline bytes', async () => {
    const outputDir = await createTempDir();

    expect(persistGeneratedClip({}, 3, outputDir, 123)).toBeUndefined();
  });
});
