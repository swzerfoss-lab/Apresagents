import fs from 'fs';
import path from 'path';

export interface PersistableGeneratedVideo {
  filePath?: string;
  videoData?: string;
}

/**
 * Resolve a locally persisted path for a generated clip.
 * Prefer an already-downloaded filePath (URI-backed Veo/Vertex results),
 * otherwise write inline base64 video bytes.
 */
export function persistGeneratedClip(
  video: PersistableGeneratedVideo,
  clipNumber: number,
  outputDir: string,
  timestamp: number = Date.now()
): string | undefined {
  if (video.filePath) {
    return video.filePath;
  }

  if (!video.videoData) {
    return undefined;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `clip_${clipNumber}_${timestamp}.mp4`);
  fs.writeFileSync(filePath, Buffer.from(video.videoData, 'base64'));
  video.filePath = filePath;
  return filePath;
}
