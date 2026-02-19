import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isStructuralFile, getArchHistory, getSnapshotContent } from './diff.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('isStructuralFile', () => {
  // Structural files
  it.each([
    ['src/cli.ts', true],
    ['src/components/App.tsx', true],
    ['lib/utils.js', true],
    ['pages/index.jsx', true],
    ['main.py', true],
    ['cmd/server/main.go', true],
    ['src/lib.rs', true],
    ['src/Main.java', true],
    ['app/models/user.rb', true],
    ['Sources/App.swift', true],
    ['src/Main.kt', true],
    ['package.json', true],
    ['tsconfig.json', true],
    ['tsconfig.build.json', true],
    ['Cargo.toml', true],
    ['go.mod', true],
    ['pyproject.toml', true],
    ['requirements.txt', true],
    ['requirements-dev.txt', true],
    ['Dockerfile', true],
    ['docker-compose.yml', true],
    ['.github/workflows/ci.yml', true],
  ])('%s → structural (%s)', (filepath, expected) => {
    expect(isStructuralFile(filepath)).toBe(expected);
  });

  // Ignorable files
  it.each([
    ['package-lock.json', false],
    ['yarn.lock', false],
    ['bun.lock', false],
    ['node_modules/chalk/index.js', false],
    ['dist/cli.js', false],
    ['build/output.js', false],
    ['bundle.min.js', false],
    ['cli.js.map', false],
    ['src/cli.test.ts', false],
    ['src/cli.spec.ts', false],
    ['__tests__/cli.ts', false],
    ['docs/architecture/OVERVIEW.md', false],
    ['docs/architecture/modules/cli.md', false],
  ])('%s → ignorable (%s)', (filepath, expected) => {
    expect(isStructuralFile(filepath)).toBe(expected);
  });

  // Non-structural, non-ignorable (e.g. markdown, text, images)
  it.each([
    ['README.md', false],
    ['logo.png', false],
    ['.gitignore', false],
    ['.env', false],
  ])('%s → not structural (%s)', (filepath, expected) => {
    expect(isStructuralFile(filepath)).toBe(expected);
  });
});

describe('getArchHistory', () => {
  let tmpDir: string;

  async function git(...args: string[]) {
    await execFileAsync('git', args, { cwd: tmpDir });
  }

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'arch-hist-'));
    await git('init');
    await git('config', 'user.email', 'test@test.com');
    await git('config', 'user.name', 'Test');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no docs exist', async () => {
    // Create an initial commit so git log doesn't fail
    await writeFile(path.join(tmpDir, 'README.md'), 'hello');
    await git('add', '.');
    await git('commit', '-m', 'init');

    const history = await getArchHistory(tmpDir);
    expect(history).toEqual([]);
  });

  it('returns snapshots for commits touching OVERVIEW.md', async () => {
    // Commit 1: initial OVERVIEW.md
    await mkdir(path.join(tmpDir, 'docs/architecture/modules'), { recursive: true });
    await writeFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), '# V1');
    await writeFile(path.join(tmpDir, 'docs/architecture/modules/cli.md'), '# CLI');
    await git('add', '.');
    await git('commit', '-m', 'Add initial architecture docs');

    // Commit 2: update OVERVIEW and add module
    await writeFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), '# V2');
    await writeFile(path.join(tmpDir, 'docs/architecture/modules/api.md'), '# API');
    await git('add', '.');
    await git('commit', '-m', 'Update architecture docs');

    const history = await getArchHistory(tmpDir);
    expect(history).toHaveLength(2);
    expect(history[0].summary).toBe('Update architecture docs');
    expect(history[0].moduleCount).toBe(2);
    expect(history[1].summary).toBe('Add initial architecture docs');
    expect(history[1].moduleCount).toBe(1);
    expect(history[0].date).toBeTruthy();
    expect(history[0].commitSha).toMatch(/^[a-f0-9]{40}$/);
  });

  it('respects limit parameter', async () => {
    await mkdir(path.join(tmpDir, 'docs/architecture'), { recursive: true });

    for (let i = 1; i <= 5; i++) {
      await writeFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), `# V${i}`);
      await git('add', '.');
      await git('commit', '-m', `Commit ${i}`);
    }

    const history = await getArchHistory(tmpDir, 3);
    expect(history).toHaveLength(3);
    expect(history[0].summary).toBe('Commit 5');
    expect(history[2].summary).toBe('Commit 3');
  });
});

describe('getSnapshotContent', () => {
  let tmpDir: string;

  async function git(...args: string[]) {
    await execFileAsync('git', args, { cwd: tmpDir });
  }

  async function getSha(): Promise<string> {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: tmpDir });
    return stdout.trim();
  }

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'arch-snap-'));
    await git('init');
    await git('config', 'user.email', 'test@test.com');
    await git('config', 'user.name', 'Test');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('reads overview and modules at a specific commit', async () => {
    await mkdir(path.join(tmpDir, 'docs/architecture/modules'), { recursive: true });
    await writeFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), '# Overview V1');
    await writeFile(path.join(tmpDir, 'docs/architecture/modules/cli.md'), '# CLI Module');
    await git('add', '.');
    await git('commit', '-m', 'v1');
    const sha1 = await getSha();

    // Update docs
    await writeFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), '# Overview V2');
    await writeFile(path.join(tmpDir, 'docs/architecture/modules/api.md'), '# API Module');
    await git('add', '.');
    await git('commit', '-m', 'v2');

    // Read V1 snapshot
    const snapshot = await getSnapshotContent(tmpDir, sha1);
    expect(snapshot.overview).toBe('# Overview V1');
    expect(snapshot.modules).toHaveLength(1);
    expect(snapshot.modules[0].name).toBe('Cli');
    expect(snapshot.modules[0].slug).toBe('cli');
    expect(snapshot.modules[0].content).toBe('# CLI Module');
  });

  it('returns empty content for non-existent commit docs', async () => {
    await writeFile(path.join(tmpDir, 'README.md'), 'hello');
    await git('add', '.');
    await git('commit', '-m', 'init');
    const sha = await getSha();

    const snapshot = await getSnapshotContent(tmpDir, sha);
    expect(snapshot.overview).toBe('');
    expect(snapshot.modules).toEqual([]);
  });
});
