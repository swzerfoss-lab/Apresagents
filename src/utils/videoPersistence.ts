import fs from 'fs';
import path from 'path';

export interface PersistableGeneratedVideo {
  filePath?: string;
  videoData?: string;
}

function resolvedClipPath(outputDir: string, clipNumber: number, timestamp: number): string {
  const outputDirResolved = path.resolve(outputDir);
  const destPath = path.resolve(outputDirResolved, `clip_${clipNumber}_${timestamp}.mp4`);
  const relative = path.relative(outputDirResolved, destPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to persist clip outside output directory: ${destPath}`);
  }
  return destPath;
}

/**
 * Resolve a locally persisted path for a generated clip under outputDir.
 * Prefer an already-downloaded filePath (URI-backed Veo/Vertex results),
 * normalizing it to the clip_N_* name that video-combine discovers.
 * Otherwise write inline base64 video bytes.
 */
export function persistGeneratedClip(
  video: PersistableGeneratedVideo,
  clipNumber: number,
  outputDir: string,
  timestamp: number = Date.now()
): string | undefined {
  fs.mkdirSync(outputDir, { recursive: true });
  const destPath = resolvedClipPath(outputDir, clipNumber, timestamp);

  if (video.filePath) {
    const sourcePath = path.resolve(video.filePath);

    if (sourcePath === destPath) {
      return destPath;
    }

    if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
      // Same-directory rename keeps the paid download; copy is used when the
      // source lives elsewhere (or rename is not possible).
      try {
        fs.renameSync(sourcePath, destPath);
      } catch {
        fs.copyFileSync(sourcePath, destPath);
        try {
          fs.unlinkSync(sourcePath);
        } catch {
          // Best-effort cleanup of the randomly named download.
        }
      }
      video.filePath = destPath;
      return destPath;
    }
  }

  if (!video.videoData) {
    return undefined;
  }

  fs.writeFileSync(destPath, Buffer.from(video.videoData, 'base64'));
  video.filePath = destPath;
  return destPath;
}
