import { execFile, execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './BaseAgent.js';
import type { BrandConfig, AgentResponse } from '../types/index.js';

const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Result of combining video clips
 */
export interface CombinedVideoResult {
  outputPath: string;
  duration: number;
  clipCount: number;
  fileSize: number;
}

/**
 * Video transition options
 */
export interface TransitionOptions {
  type: 'none' | 'fade' | 'crossfade';
  duration?: number; // seconds
}

/**
 * Video Editor Agent
 * Responsible for combining video clips into final videos using ffmpeg
 */
export class VideoEditorAgent extends BaseAgent {
  private ffmpegAvailable: boolean = false;

  constructor(brandConfig: BrandConfig) {
    super(
      {
        name: 'Video Editor Agent',
        description: 'Combines video clips into final videos using ffmpeg',
        systemPrompt: `You are a video editing assistant for Apres Feels.
Your role is to help combine video clips into polished final videos.`,
        temperature: 0.3,
      },
      brandConfig
    );

    this.checkFfmpeg();
  }

  /**
   * Check if ffmpeg is available on the system
   */
  private checkFfmpeg(): void {
    try {
      execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
      this.ffmpegAvailable = true;
      console.log('[VideoEditor] ffmpeg is available');
    } catch {
      this.ffmpegAvailable = false;
      console.log('[VideoEditor] ffmpeg not found - install with: brew install ffmpeg');
    }
  }

  /**
   * Check if the editor can combine videos
   */
  isAvailable(): boolean {
    return this.ffmpegAvailable;
  }

  /**
   * Get ffmpeg installation instructions
   */
  getInstallInstructions(): string {
    return `
To enable automatic video combining, install ffmpeg:

Mac:     brew install ffmpeg
Ubuntu:  sudo apt install ffmpeg
Windows: choco install ffmpeg

After installing, restart your terminal and try again.
    `.trim();
  }

  /**
   * Combine multiple video clips into a single video
   */
  async combineClips(
    clipPaths: string[],
    outputPath: string,
    options: TransitionOptions = { type: 'none' }
  ): Promise<AgentResponse<CombinedVideoResult>> {
    if (!this.ffmpegAvailable) {
      return {
        success: false,
        error: `ffmpeg is not installed. ${this.getInstallInstructions()}`,
      };
    }

    if (clipPaths.length === 0) {
      return { success: false, error: 'No clips provided' };
    }

    const resolvedClips = clipPaths.map((clipPath) => path.resolve(clipPath));
    const resolvedOutput = path.resolve(outputPath);

    // Verify all clips exist as regular files
    for (const clipPath of resolvedClips) {
      if (!fs.existsSync(clipPath)) {
        return { success: false, error: `Clip not found: ${clipPath}` };
      }

      if (!fs.statSync(clipPath).isFile()) {
        return { success: false, error: `Clip is not a regular file: ${clipPath}` };
      }
    }

    if (resolvedClips.some((clipPath) => clipPath === resolvedOutput)) {
      return {
        success: false,
        error: 'Output path must not match any input clip path',
      };
    }

    // Ensure output directory exists
    const outputDir = path.dirname(resolvedOutput);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to a temp file first so failed/partial combines cannot destroy an
    // existing final video or overwrite an input clip mid-encode.
    const tempOutput = path.join(
      outputDir,
      `.video_combine_${process.pid}_${Date.now()}_${randomUUID()}.tmp.mp4`
    );

    try {
      if (options.type === 'none') {
        // Simple concatenation without transitions
        await this.concatSimple(resolvedClips, tempOutput);
      } else if (options.type === 'fade' || options.type === 'crossfade') {
        // Concatenation with fade transitions
        await this.concatWithFades(resolvedClips, tempOutput, options.duration || 0.5);
      }

      fs.renameSync(tempOutput, resolvedOutput);

      // Get output file info
      const stats = fs.statSync(resolvedOutput);
      const duration = await this.getVideoDuration(resolvedOutput);

      return {
        success: true,
        data: {
          outputPath: resolvedOutput,
          duration,
          clipCount: resolvedClips.length,
          fileSize: stats.size,
        },
      };
    } catch (error) {
      if (fs.existsSync(tempOutput)) {
        try {
          fs.unlinkSync(tempOutput);
        } catch {
          // Best-effort cleanup of the failed temp output.
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to combine clips: ${errorMessage}` };
    }
  }

  /**
   * Simple concatenation without transitions
   */
  private async concatSimple(clipPaths: string[], outputPath: string): Promise<void> {
    // Create a temporary file list for ffmpeg
    const listFile = path.join(path.dirname(outputPath), `concat_list_${Date.now()}.txt`);
    const fileContent = clipPaths.map((p) => `file ${this.formatConcatFilePath(path.resolve(p))}`).join('\n');
    fs.writeFileSync(listFile, fileContent);

    try {
      // Use ffmpeg concat demuxer for efficient concatenation
      const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath];
      console.log('[VideoEditor] Running ffmpeg concat');

      await this.runFfmpeg(args);
    } finally {
      // Clean up temp file
      if (fs.existsSync(listFile)) {
        fs.unlinkSync(listFile);
      }
    }
  }

  /**
   * Concatenation with fade transitions between clips
   */
  private async concatWithFades(
    clipPaths: string[],
    outputPath: string,
    fadeDuration: number
  ): Promise<void> {
    if (clipPaths.length === 1) {
      // Single clip, just copy it
      fs.copyFileSync(clipPaths[0], outputPath);
      return;
    }

    // For crossfade, we need to use complex filter
    // Build the filter graph
    const inputArgs = clipPaths.flatMap((p) => ['-i', p]);

    // Build filter for crossfade between clips.
    // xfade offset is relative to the growing left-hand stream, so each
    // subsequent transition must start at the cumulative timeline position
    // (sum of prior clip durations minus prior fades), not just the previous
    // source clip's duration.
    let filterComplex = '';
    let currentStream = '[0:v]';
    let audioStream = '[0:a]';
    let cumulativeOffset = 0;

    for (let i = 1; i < clipPaths.length; i++) {
      const nextVideo = `[${i}:v]`;
      const nextAudio = `[${i}:a]`;
      const outVideo = `[v${i}]`;
      const outAudio = `[a${i}]`;

      const clipDuration = await this.getVideoDuration(clipPaths[i - 1]);
      if (!(clipDuration > fadeDuration)) {
        throw new Error(
          `Clip duration (${clipDuration}s) must be greater than fade duration (${fadeDuration}s): ${clipPaths[i - 1]}`
        );
      }

      const offset = cumulativeOffset + clipDuration - fadeDuration;
      cumulativeOffset = offset;

      filterComplex += `${currentStream}${nextVideo}xfade=transition=fade:duration=${fadeDuration}:offset=${offset}${outVideo};`;
      filterComplex += `${audioStream}${nextAudio}acrossfade=d=${fadeDuration}${outAudio};`;

      currentStream = outVideo;
      audioStream = outAudio;
    }

    // Remove trailing semicolon and map final streams
    filterComplex = filterComplex.slice(0, -1);

    const args = [
      '-y',
      ...inputArgs,
      '-filter_complex',
      filterComplex,
      '-map',
      currentStream,
      '-map',
      audioStream,
      outputPath,
    ];
    console.log('[VideoEditor] Running crossfade command...');

    await this.runFfmpeg(args);
  }

  /**
   * Get the duration of a video file in seconds
   */
  private async getVideoDuration(filePath: string): Promise<number> {
    try {
      const result = execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
        { encoding: 'utf-8', timeout: 30_000 }
      );
      return parseFloat(result.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Escape a path for ffmpeg's concat demuxer list file format.
   */
  private formatConcatFilePath(filePath: string): string {
    if (/[\r\n]/.test(filePath)) {
      throw new Error(`Clip path contains unsupported newline characters: ${filePath}`);
    }

    return `'${filePath.replace(/\\/g, '\\\\').replace(/'/g, "'\\''")}'`;
  }

  /**
   * Run ffmpeg with argument arrays so filenames are never interpreted by a shell.
   */
  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        'ffmpeg',
        args,
        { maxBuffer: 50 * 1024 * 1024, timeout: FFMPEG_TIMEOUT_MS },
        (error, _stdout, stderr) => {
          if (error) {
            console.error('[VideoEditor] stderr:', stderr);
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Find all clip files in a directory, sorted by clip number.
   * When multiple files share a clip number (e.g. re-generation into the same
   * folder), keep only the newest by mtime so combine does not duplicate scenes.
   */
  findClipsInDirectory(directory: string): string[] {
    if (!fs.existsSync(directory)) {
      return [];
    }

    const newestByNumber = new Map<number, { path: string; mtimeMs: number }>();

    for (const name of fs.readdirSync(directory)) {
      if (!name.startsWith('clip_') || !name.endsWith('.mp4')) {
        continue;
      }

      const number = parseInt(name.match(/clip_(\d+)/)?.[1] || '0', 10);
      if (!number) {
        continue;
      }

      const clipPath = path.join(directory, name);
      let mtimeMs: number;
      try {
        const stats = fs.statSync(clipPath);
        if (!stats.isFile()) {
          continue;
        }
        mtimeMs = stats.mtimeMs;
      } catch {
        continue;
      }

      const existing = newestByNumber.get(number);
      if (!existing || mtimeMs >= existing.mtimeMs) {
        newestByNumber.set(number, { path: clipPath, mtimeMs });
      }
    }

    return [...newestByNumber.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, clip]) => clip.path);
  }

  /**
   * Combine all clips in a directory into a final video
   */
  async combineClipsInDirectory(
    directory: string,
    outputFilename: string = 'final_video.mp4',
    options: TransitionOptions = { type: 'none' }
  ): Promise<AgentResponse<CombinedVideoResult>> {
    const clips = this.findClipsInDirectory(directory);

    if (clips.length === 0) {
      return { success: false, error: `No clips found in ${directory}` };
    }

    console.log(`[VideoEditor] Found ${clips.length} clips to combine`);
    clips.forEach((c, i) => console.log(`  ${i + 1}. ${path.basename(c)}`));

    const outputPath = path.join(directory, outputFilename);
    return this.combineClips(clips, outputPath, options);
  }
}
