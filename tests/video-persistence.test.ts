import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
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
  it('normalizes an already downloaded file into clip_N naming for video-combine', async () => {
    const outputDir = await createTempDir();
    const downloaded = path.join(outputDir, 'apresfeels_video_1.mp4');
    await writeFile(downloaded, 'uri-backed bytes');
    const video = { filePath: downloaded };

    const filePath = persistGeneratedClip(video, 1, outputDir, 123);

    expect(filePath).toBe(path.join(outputDir, 'clip_1_123.mp4'));
    expect(video.filePath).toBe(filePath);
    await expect(readFile(filePath!, 'utf-8')).resolves.toBe('uri-backed bytes');
    await expect(readFile(downloaded, 'utf-8')).rejects.toThrow();
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

  it('returns undefined when filePath is missing on disk and there are no bytes', async () => {
    const outputDir = await createTempDir();
    const video = { filePath: path.join(outputDir, 'missing.mp4') };

    expect(persistGeneratedClip(video, 4, outputDir, 123)).toBeUndefined();
  });
});
