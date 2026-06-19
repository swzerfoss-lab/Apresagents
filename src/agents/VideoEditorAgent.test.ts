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
        _options: { maxBuffer: number },
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
    expect(ffmpegArgs).toContain(outputPath);
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
});
