import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BaseAgent } from './BaseAgent.js';
import type { BrandConfig, AgentResponse } from '../types/index.js';

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
      execSync('ffmpeg -version', { stdio: 'pipe' });
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

    // Verify all clips exist
    for (const clipPath of clipPaths) {
      if (!fs.existsSync(clipPath)) {
        return { success: false, error: `Clip not found: ${clipPath}` };
      }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      if (options.type === 'none') {
        // Simple concatenation without transitions
        await this.concatSimple(clipPaths, outputPath);
      } else if (options.type === 'fade' || options.type === 'crossfade') {
        // Concatenation with fade transitions
        await this.concatWithFades(clipPaths, outputPath, options.duration || 0.5);
      }

      // Get output file info
      const stats = fs.statSync(outputPath);
      const duration = await this.getVideoDuration(outputPath);

      return {
        success: true,
        data: {
          outputPath,
          duration,
          clipCount: clipPaths.length,
          fileSize: stats.size,
        },
      };
    } catch (error) {
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
    const fileContent = clipPaths.map((p) => `file '${path.resolve(p)}'`).join('\n');
    fs.writeFileSync(listFile, fileContent);

    try {
      // Use ffmpeg concat demuxer for efficient concatenation
      const command = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
      console.log('[VideoEditor] Running:', command);

      await this.runCommand(command);
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
    const inputs = clipPaths.map((p, _i) => `-i "${p}"`).join(' ');

    // Build filter for crossfade between clips
    let filterComplex = '';
    let currentStream = '[0:v]';
    let audioStream = '[0:a]';

    for (let i = 1; i < clipPaths.length; i++) {
      const nextVideo = `[${i}:v]`;
      const nextAudio = `[${i}:a]`;
      const outVideo = `[v${i}]`;
      const outAudio = `[a${i}]`;

      // Get duration of current clip to calculate offset
      const clipDuration = await this.getVideoDuration(clipPaths[i - 1]);
      const offset = clipDuration - fadeDuration;

      filterComplex += `${currentStream}${nextVideo}xfade=transition=fade:duration=${fadeDuration}:offset=${offset}${outVideo};`;
      filterComplex += `${audioStream}${nextAudio}acrossfade=d=${fadeDuration}${outAudio};`;

      currentStream = outVideo;
      audioStream = outAudio;
    }

    // Remove trailing semicolon and map final streams
    filterComplex = filterComplex.slice(0, -1);

    const command = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "${currentStream}" -map "${audioStream}" "${outputPath}"`;
    console.log('[VideoEditor] Running crossfade command...');

    await this.runCommand(command);
  }

  /**
   * Get the duration of a video file in seconds
   */
  private async getVideoDuration(filePath: string): Promise<number> {
    try {
      const result = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        { encoding: 'utf-8' }
      );
      return parseFloat(result.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Run a shell command and return a promise
   */
  private runCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('[VideoEditor] stderr:', stderr);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Find all clip files in a directory, sorted by clip number
   */
  findClipsInDirectory(directory: string): string[] {
    if (!fs.existsSync(directory)) {
      return [];
    }

    const files = fs.readdirSync(directory);
    const clipFiles = files
      .filter((f) => f.startsWith('clip_') && f.endsWith('.mp4'))
      .map((f) => ({
        name: f,
        path: path.join(directory, f),
        number: parseInt(f.match(/clip_(\d+)/)?.[1] || '0', 10),
      }))
      .sort((a, b) => a.number - b.number)
      .map((f) => f.path);

    return clipFiles;
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
