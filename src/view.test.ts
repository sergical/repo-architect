import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { slugify, loadViewerData } from './view.js';
import { getViewerHtml } from './viewer-template.js';
import type { ViewerData } from './viewer-template.js';

// --- slugify ---

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('My Module')).toBe('my-module');
  });

  it('replaces non-alphanumeric chars', () => {
    expect(slugify('CLI_Scanner (v2)')).toBe('cli-scanner-v2');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('collapses consecutive special chars to single hyphen', () => {
    expect(slugify('a...b___c')).toBe('a-b-c');
  });
});

// --- loadViewerData ---

describe('loadViewerData', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(fs =>
      fs.mkdtemp(path.join(os.tmpdir(), 'repo-arch-test-'))
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty data when no docs exist', async () => {
    const data = await loadViewerData(tmpDir);
    expect(data.overview).toBe('');
    expect(data.modules).toEqual([]);
    expect(data.lastRunAt).toBeNull();
    expect(data.projectName).toBe(path.basename(tmpDir));
  });

  it('reads OVERVIEW.md and module files', async () => {
    const archDir = path.join(tmpDir, 'docs/architecture');
    const modulesDir = path.join(archDir, 'modules');
    await mkdir(modulesDir, { recursive: true });

    await writeFile(path.join(archDir, 'OVERVIEW.md'), '# My Project\n\nOverview content.');
    await writeFile(path.join(modulesDir, 'cli.md'), '# CLI Module\n\nCLI details.');
    await writeFile(path.join(modulesDir, 'scanner.md'), '# Scanner Module\n\nScanner details.');
    await writeFile(path.join(modulesDir, 'not-markdown.txt'), 'should be ignored');

    const data = await loadViewerData(tmpDir);
    expect(data.overview).toBe('# My Project\n\nOverview content.');
    expect(data.modules).toHaveLength(2);
    expect(data.modules[0].name).toBe('Cli');
    expect(data.modules[0].slug).toBe('cli');
    expect(data.modules[0].content).toContain('CLI Module');
    expect(data.modules[1].name).toBe('Scanner');
    expect(data.modules[1].slug).toBe('scanner');
  });

  it('reads lastRunAt from .arch-state.json', async () => {
    const archDir = path.join(tmpDir, 'docs/architecture');
    await mkdir(archDir, { recursive: true });

    const state = {
      lastCommitSha: 'abc123',
      lastRunAt: '2026-02-17T10:00:00Z',
      modules: [],
      repoRoot: tmpDir,
    };
    await writeFile(path.join(archDir, '.arch-state.json'), JSON.stringify(state));

    const data = await loadViewerData(tmpDir);
    expect(data.lastRunAt).toBe('2026-02-17T10:00:00Z');
  });

  it('sorts module files alphabetically', async () => {
    const modulesDir = path.join(tmpDir, 'docs/architecture/modules');
    await mkdir(modulesDir, { recursive: true });

    await writeFile(path.join(modulesDir, 'zebra.md'), '# Zebra');
    await writeFile(path.join(modulesDir, 'alpha.md'), '# Alpha');
    await writeFile(path.join(modulesDir, 'middle.md'), '# Middle');

    const data = await loadViewerData(tmpDir);
    expect(data.modules.map(m => m.slug)).toEqual(['alpha', 'middle', 'zebra']);
  });
});

// --- getViewerHtml ---

describe('getViewerHtml', () => {
  const baseData: ViewerData = {
    projectName: 'test-project',
    overview: '# Hello World\n\nSome content.',
    modules: [
      { name: 'CLI', slug: 'cli', content: '# CLI\n\nCLI docs.' },
      { name: 'Scanner', slug: 'scanner', content: '# Scanner\n\nScanner docs.' },
    ],
    lastRunAt: '2026-02-17T10:00:00Z',
  };

  it('generates valid HTML with doctype', () => {
    const html = getViewerHtml(baseData);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('</html>');
  });

  it('includes project name in title', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain('<title>test-project - Architecture</title>');
  });

  it('includes mermaid and marked CDN scripts', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain('cdn.jsdelivr.net/npm/mermaid@11');
    expect(html).toContain('cdn.jsdelivr.net/npm/marked@15');
  });

  it('embeds data as JSON payload', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain('window.__ARCH_DATA__');
    // Verify the payload is parseable (after unescaping)
    const match = html.match(/window\.__ARCH_DATA__ = (.+?);/s);
    expect(match).toBeTruthy();
    const parsed = JSON.parse(match![1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>'));
    expect(parsed.projectName).toBe('test-project');
    expect(parsed.modules).toHaveLength(2);
  });

  it('escapes HTML entities in project name', () => {
    const data: ViewerData = {
      ...baseData,
      projectName: '<script>alert("xss")</script>',
    };
    const html = getViewerHtml(data);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes angle brackets in JSON payload', () => {
    const data: ViewerData = {
      ...baseData,
      overview: '# Test\n\n<script>alert("xss")</script>',
    };
    const html = getViewerHtml(data);
    // The JSON payload should not contain raw </script> which would break the HTML
    const payloadSection = html.split('window.__ARCH_DATA__ = ')[1]?.split(';</script>')[0];
    expect(payloadSection).not.toContain('</script>');
    expect(payloadSection).toContain('\\u003c');
  });

  it('renders empty state when no overview', () => {
    const data: ViewerData = {
      ...baseData,
      overview: '',
      modules: [],
    };
    const html = getViewerHtml(data);
    expect(html).toContain('No docs yet');
  });

  it('includes sidebar with module navigation', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain('sidebar');
    expect(html).toContain('nav');
  });

  it('uses dark theme colors', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain('#0a0a0a');
    expect(html).toContain('#111');
  });

  it('includes responsive styles', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain('@media (max-width: 768px)');
  });

  it('binds to 127.0.0.1 in mermaid dark theme config', () => {
    const html = getViewerHtml(baseData);
    expect(html).toContain("theme: 'dark'");
  });
});
