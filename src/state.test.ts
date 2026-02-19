import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { readState, writeState } from './state.js';
import type { ArchState } from './state.js';

describe('state round-trip', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(fs =>
      fs.mkdtemp(path.join(os.tmpdir(), 'state-test-'))
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes and reads state correctly', async () => {
    const state: ArchState = {
      lastCommitSha: 'abc123def456',
      lastRunAt: '2026-02-18T10:00:00Z',
      modules: [
        { name: 'CLI', path: 'src/cli', description: 'Command line interface' },
        { name: 'API', path: 'src/api', description: 'REST API layer' },
      ],
      repoRoot: '/fake/root',
    };

    await writeState(tmpDir, state);
    const read = await readState(tmpDir);

    expect(read).not.toBeNull();
    expect(read!.lastCommitSha).toBe('abc123def456');
    expect(read!.lastRunAt).toBe('2026-02-18T10:00:00Z');
    expect(read!.modules).toHaveLength(2);
    expect(read!.modules[0].name).toBe('CLI');
    expect(read!.modules[1].name).toBe('API');
    expect(read!.repoRoot).toBe('/fake/root');
  });

  it('returns null for nonexistent state', async () => {
    const result = await readState(tmpDir);
    expect(result).toBeNull();
  });

  it('overwrites existing state', async () => {
    const state1: ArchState = {
      lastCommitSha: 'first',
      lastRunAt: '2026-02-17T10:00:00Z',
      modules: [],
      repoRoot: tmpDir,
    };
    const state2: ArchState = {
      lastCommitSha: 'second',
      lastRunAt: '2026-02-18T10:00:00Z',
      modules: [{ name: 'New', path: 'src/new', description: 'New module' }],
      repoRoot: tmpDir,
    };

    await writeState(tmpDir, state1);
    await writeState(tmpDir, state2);
    const read = await readState(tmpDir);

    expect(read!.lastCommitSha).toBe('second');
    expect(read!.modules).toHaveLength(1);
  });
});
