import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { loadConfig, createDefaultConfig, DEFAULT_CONFIG } from './config.js';

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(fs =>
      fs.mkdtemp(path.join(os.tmpdir(), 'repo-arch-config-test-'))
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig(tmpDir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('loads valid JSON config', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      outputDir: 'custom/docs',
      ignore: ['*.test.ts'],
      include: ['src/**'],
      model: 'claude-sonnet-4-5-20250514',
    }));

    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('custom/docs');
    expect(config.ignore).toEqual(['*.test.ts']);
    expect(config.include).toEqual(['src/**']);
  });

  it('merges partial config with defaults', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      outputDir: 'my-docs',
    }));

    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('my-docs');
    expect(config.ignore).toEqual([]);
    expect(config.include).toEqual([]);
    expect(config.model).toBe(DEFAULT_CONFIG.model);
  });

  it('throws on malformed JSON', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), '{not valid json');
    await expect(loadConfig(tmpDir)).rejects.toThrow('Invalid JSON');
  });

  it('throws on wrong type for outputDir', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      outputDir: 123,
    }));
    await expect(loadConfig(tmpDir)).rejects.toThrow('outputDir must be a string');
  });

  it('throws on absolute outputDir', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      outputDir: '/absolute/path',
    }));
    await expect(loadConfig(tmpDir)).rejects.toThrow('outputDir must be a relative path');
  });

  it('throws on wrong type for ignore', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      ignore: 'not-an-array',
    }));
    await expect(loadConfig(tmpDir)).rejects.toThrow('ignore must be an array of strings');
  });

  it('throws on wrong type for model', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      model: 42,
    }));
    await expect(loadConfig(tmpDir)).rejects.toThrow('model must be a string');
  });

  it('ignores unknown keys', async () => {
    await writeFile(path.join(tmpDir, '.repo-architect.json'), JSON.stringify({
      unknownKey: 'value',
      outputDir: 'custom',
    }));

    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('custom');
    expect((config as Record<string, unknown>)['unknownKey']).toBeUndefined();
  });
});

describe('createDefaultConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(fs =>
      fs.mkdtemp(path.join(os.tmpdir(), 'repo-arch-config-test-'))
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a valid JSON config file', async () => {
    const configPath = await createDefaultConfig(tmpDir);
    expect(configPath).toBe(path.join(tmpDir, '.repo-architect.json'));

    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(DEFAULT_CONFIG);
  });
});
