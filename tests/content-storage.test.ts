import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentStorage } from '../src/storage/ContentStorage.js';
import { WeeklyWorkflow } from '../src/types/index.js';

const tempDirs: string[] = [];

function createWorkflow(id: string): WeeklyWorkflow {
  const now = new Date('2026-04-30T00:00:00.000Z');

  return {
    id,
    weekStartDate: now,
    weekEndDate: now,
    status: 'running',
    currentStage: 'strategy',
    createdAt: now,
    posts: [],
    errors: [],
    metrics: {
      totalPosts: 0,
      postsCompleted: 0,
      imagesGenerated: 0,
      videosGenerated: 0,
    },
    stageApprovals: [],
    awaitingApproval: false,
  };
}

async function createStorageDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'content-storage-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ContentStorage', () => {
  it('does not overwrite workflows when the workflow index is corrupt', async () => {
    const storageDir = await createStorageDir();
    const workflowsFile = path.join(storageDir, 'workflows.json');
    const storage = new ContentStorage(storageDir);

    await expect(storage.getAllWorkflows()).resolves.toEqual([]);
    await writeFile(workflowsFile, '{"workflows": [');

    await expect(storage.saveWorkflow(createWorkflow('new-workflow'))).rejects.toThrow();
    await expect(readFile(workflowsFile, 'utf-8')).resolves.toBe('{"workflows": [');
  });

  it('serializes concurrent workflow saves against the same storage file', async () => {
    const storageDir = await createStorageDir();
    const firstStorage = new ContentStorage(storageDir);
    const secondStorage = new ContentStorage(storageDir);

    await Promise.all([
      firstStorage.saveWorkflow(createWorkflow('workflow-a')),
      secondStorage.saveWorkflow(createWorkflow('workflow-b')),
    ]);

    const workflows = await firstStorage.getAllWorkflows();
    expect(workflows.map((workflow) => workflow.id).sort()).toEqual(['workflow-a', 'workflow-b']);
  });
});
