import { afterEach, describe, expect, it, vi } from 'vitest';

type FsPromises = typeof import('fs/promises');
type WriteFile = FsPromises['writeFile'];

const fsMock = vi.hoisted((): {
  writeFileHook?: (
    actualWriteFile: WriteFile,
    ...args: Parameters<WriteFile>
  ) => ReturnType<WriteFile>;
} => ({}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<FsPromises>();
  const writeFile = vi.fn((...args: Parameters<WriteFile>) => {
    const hook = fsMock.writeFileHook;

    if (hook) {
      fsMock.writeFileHook = undefined;
      return hook(actual.writeFile, ...args);
    }

    return actual.writeFile(...args);
  }) as unknown as WriteFile;

  return {
    ...actual,
    default: {
      ...actual.default,
      writeFile,
    },
    writeFile,
  };
});

import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { ContentStorage } from '../src/storage/ContentStorage.js';
import { ReadyPost, WeeklyWorkflow } from '../src/types/index.js';

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

function createPost(id: string, workflowId: string): ReadyPost {
  const now = new Date('2026-04-30T00:00:00.000Z');

  return {
    id,
    workflowId,
    platform: 'instagram',
    contentType: 'post',
    category: 'promotional',
    scheduledDate: now,
    scheduledTime: '09:00',
    status: 'ready',
    caption: `Caption for ${id}`,
    hashtags: ['#skincare'],
    callToAction: 'Shop now',
    images: [],
    videos: [],
    platformFormatting: {
      platform: 'instagram',
      formattedCaption: `Caption for ${id}`,
      formattedHashtags: '#skincare',
      characterCount: 14,
      hashtagCount: 1,
      aspectRatio: '1:1',
      additionalNotes: [],
      isWithinLimits: true,
    },
    createdAt: now,
  };
}

async function createStorageDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'content-storage-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  fsMock.writeFileHook = undefined;
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ContentStorage', () => {
  it('does not let a late initializer overwrite workflows created by another writer', async () => {
    const storageDir = await createStorageDir();
    const workflowsFile = path.join(storageDir, 'workflows.json');
    const existingData = JSON.stringify({ workflows: [createWorkflow('existing-workflow')] }, null, 2);

    fsMock.writeFileHook = async (actualWriteFile, file, data, options) => {
      await actualWriteFile(workflowsFile, existingData);
      return actualWriteFile(file, data, options);
    };

    const storage = new ContentStorage(storageDir);

    const workflows = await storage.getAllWorkflows();

    expect(workflows.map((workflow) => workflow.id)).toEqual(['existing-workflow']);
    await expect(readFile(workflowsFile, 'utf-8')).resolves.toBe(existingData);
  });

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

  it('preserves concurrent status updates for different posts in the same workflow', async () => {
    const storageDir = await createStorageDir();
    const storage = new ContentStorage(storageDir);
    const workflow = createWorkflow('workflow-status-race');
    workflow.posts = Array.from({ length: 8 }, (_value, index) =>
      createPost(`post-${index}`, workflow.id)
    );
    workflow.metrics.totalPosts = workflow.posts.length;

    await storage.saveWorkflow(workflow);

    await Promise.all(
      workflow.posts.map((post, index) => {
        const status = index % 2 === 0 ? 'approved' : 'published';
        const timestamp = new Date(`2026-04-30T00:00:0${index}.000Z`);
        return new ContentStorage(storageDir).updatePostStatus(post.id, status, timestamp);
      })
    );

    const loaded = await storage.getWorkflow(workflow.id);

    expect(loaded?.posts.map((post) => post.status)).toEqual([
      'approved',
      'published',
      'approved',
      'published',
      'approved',
      'published',
      'approved',
      'published',
    ]);
  });

  it('deserializes nested workflow dates after loading from storage', async () => {
    const storageDir = await createStorageDir();
    const storage = new ContentStorage(storageDir);
    const scheduledDate = new Date('2026-05-04T12:00:00.000Z');
    const startTime = new Date('2026-04-30T01:00:00.000Z');
    const endTime = new Date('2026-04-30T02:00:00.000Z');
    const errorTime = new Date('2026-04-30T03:00:00.000Z');
    const workflow = createWorkflow('workflow-dates');

    workflow.strategy = {
      weekNumber: 18,
      year: 2026,
      theme: 'Spring launch',
      goals: ['Launch campaign'],
      posts: [
        {
          id: 'planned-post-1',
          scheduledDate,
          scheduledTime: '09:00',
          platform: 'instagram',
          contentType: 'post',
          category: 'promotional',
          topic: 'Spring products',
          briefDescription: 'Announce the spring product collection',
          priority: 'high',
        },
      ],
    };
    workflow.metrics.startTime = startTime;
    workflow.metrics.endTime = endTime;
    workflow.errors.push({
      stage: 'assembly',
      message: 'Transient formatting failure',
      timestamp: errorTime,
      recoverable: true,
    });

    await storage.saveWorkflow(workflow);

    const loaded = await storage.getWorkflow('workflow-dates');

    expect(loaded?.strategy?.posts[0].scheduledDate).toBeInstanceOf(Date);
    expect(loaded?.strategy?.posts[0].scheduledDate.toISOString()).toBe(scheduledDate.toISOString());
    expect(loaded?.metrics.startTime).toBeInstanceOf(Date);
    expect(loaded?.metrics.startTime?.toISOString()).toBe(startTime.toISOString());
    expect(loaded?.metrics.endTime).toBeInstanceOf(Date);
    expect(loaded?.metrics.endTime?.toISOString()).toBe(endTime.toISOString());
    expect(loaded?.errors[0].timestamp).toBeInstanceOf(Date);
    expect(loaded?.errors[0].timestamp.toISOString()).toBe(errorTime.toISOString());
  });
});
