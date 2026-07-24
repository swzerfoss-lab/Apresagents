import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrandConfig } from '../types/index.js';

const childProcessMocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  execFileSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFile: childProcessMocks.execFile,
  execFileSync: childProcessMocks.execFileSync,
}));

import { VideoEditorAgent } from './VideoEditorAgent.js';

const brandConfig: BrandConfig = {
  name: 'Test Brand',
  description: 'A test brand',
  tone: ['clear'],
  targetAudience: 'testers',
};

describe('VideoEditorAgent', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-editor-'));
    childProcessMocks.execFile.mockReset();
    childProcessMocks.execFileSync.mockReset();

    childProcessMocks.execFileSync.mockImplementation((command: string) => {
      if (command === 'ffmpeg') {
        return Buffer.from('ffmpeg version');
      }

      if (command === 'ffprobe') {
        return '12.5\n';
      }

      return '';
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('passes shell metacharacters in paths as ffmpeg arguments, not shell syntax', async () => {
    const injectedMarker = path.join(tempDir, 'owned');
    const clipOne = path.join(tempDir, 'clip_1_"$(touch owned)".mp4');
    const clipTwo = path.join(tempDir, "clip_2_'semi;colon'.mp4");
    const outputPath = path.join(tempDir, 'final_$(touch owned).mp4');
    let concatListContent = '';

    fs.writeFileSync(clipOne, 'clip-one');
    fs.writeFileSync(clipTwo, 'clip-two');

    childProcessMocks.execFile.mockImplementation(
      (
        command: string,
        args: string[],
        _options: { maxBuffer: number; timeout?: number },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        expect(command).toBe('ffmpeg');
        const inputIndex = args.indexOf('-i');
        concatListContent = fs.readFileSync(args[inputIndex + 1], 'utf-8');
        fs.writeFileSync(args[args.length - 1], 'combined-video');
        callback(null, '', '');
      }
    );

    const agent = new VideoEditorAgent(brandConfig);
    const result = await agent.combineClips([clipOne, clipTwo], outputPath);

    expect(result.success).toBe(true);
    expect(fs.existsSync(injectedMarker)).toBe(false);
    expect(childProcessMocks.execFile).toHaveBeenCalledTimes(1);

    const ffmpegArgs = childProcessMocks.execFile.mock.calls[0][1] as string[];
    const ffmpegTarget = ffmpegArgs[ffmpegArgs.length - 1] as string;
    expect(ffmpegTarget).not.toBe(outputPath);
    expect(ffmpegTarget).toContain('.video_combine_');
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('combined-video');
    expect(ffmpegArgs.join(' ')).not.toContain('ffmpeg ');
    expect(concatListContent.split('\n')).toHaveLength(2);
    expect(concatListContent).toContain("clip_2_'\\''semi;colon'\\''.mp4");
  });

  it('rejects newline characters that would add extra concat-list entries', async () => {
    const clipPath = path.join(tempDir, 'clip_1_bad\nfile passwd.mp4');
    const outputPath = path.join(tempDir, 'final.mp4');

    fs.writeFileSync(clipPath, 'clip');

    const agent = new VideoEditorAgent(brandConfig);
    const result = await agent.combineClips([clipPath], outputPath);

    expect(result.success).toBe(false);
    expect(result.error).toContain('unsupported newline characters');
    expect(childProcessMocks.execFile).not.toHaveBeenCalled();
  });

  it('rejects output paths that collide with an input clip', async () => {
    const clipOne = path.join(tempDir, 'clip_1.mp4');
    const clipTwo = path.join(tempDir, 'clip_2.mp4');
    fs.writeFileSync(clipOne, 'clip-one');
    fs.writeFileSync(clipTwo, 'clip-two');

    const agent = new VideoEditorAgent(brandConfig);
    const result = await agent.combineClips([clipOne, clipTwo], clipOne);

    expect(result.success).toBe(false);
    expect(result.error).toContain('must not match any input clip path');
    expect(fs.readFileSync(clipOne, 'utf-8')).toBe('clip-one');
    expect(childProcessMocks.execFile).not.toHaveBeenCalled();
  });

  it('preserves an existing final video when ffmpeg fails', async () => {
    const clipOne = path.join(tempDir, 'clip_1.mp4');
    const clipTwo = path.join(tempDir, 'clip_2.mp4');
    const outputPath = path.join(tempDir, 'final_video.mp4');
    fs.writeFileSync(clipOne, 'clip-one');
    fs.writeFileSync(clipTwo, 'clip-two');
    fs.writeFileSync(outputPath, 'GOOD_FINAL');

    childProcessMocks.execFile.mockImplementation(
      (
        _command: string,
        args: string[],
        _options: { maxBuffer: number; timeout?: number },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        const tempOutput = args[args.length - 1] as string;
        fs.writeFileSync(tempOutput, 'PARTIAL_BAD_OUTPUT');
        callback(new Error('ffmpeg failed'), '', 'encode error');
      }
    );

    const agent = new VideoEditorAgent(brandConfig);
    const result = await agent.combineClips([clipOne, clipTwo], outputPath);

    expect(result.success).toBe(false);
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('GOOD_FINAL');
    expect(fs.readdirSync(tempDir).some((name) => name.includes('.video_combine_'))).toBe(false);
  });
});
