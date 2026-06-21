import { mkdtemp, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisualContentAgent } from './VisualContentAgent.js';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'visual-content-agent-'));
  tempDirs.push(dir);
  return dir;
}

function createVisualAgent(): VisualContentAgent {
  const agent = Object.create(VisualContentAgent.prototype) as VisualContentAgent;
  const testAgent = agent as unknown as {
    genAI: {
      models: {
        generateImages: ReturnType<typeof vi.fn>;
      };
    };
    imageModelName: string;
  };

  testAgent.genAI = {
    models: {
      generateImages: vi.fn().mockResolvedValue({
        generatedImages: [
          {
            image: {
              imageBytes: Buffer.from('valid image bytes').toString('base64'),
            },
          },
        ],
      }),
    },
  };
  testAgent.imageModelName = 'test-image-model';

  return agent;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('VisualContentAgent.generateImage local persistence', () => {
  it('uses unique filenames for concurrent saves in the same millisecond', async () => {
    const outputDirectory = await createTempDir();
    const agent = createVisualAgent();
    vi.spyOn(Date, 'now').mockReturnValue(1760000000000);

    const results = await Promise.all([
      agent.generateImage('first alpine product shot', { outputDirectory }),
      agent.generateImage('second alpine product shot', { outputDirectory }),
    ]);

    const filePaths = results.map((result) => result.data?.filePath);
    expect(results.every((result) => result.success)).toBe(true);
    expect(new Set(filePaths).size).toBe(2);
    expect(await readdir(outputDirectory)).toHaveLength(2);
  });
});
