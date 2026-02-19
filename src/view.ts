import { createServer } from 'node:http';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { platform } from 'node:os';

import { readState } from './state.js';
import { getViewerHtml } from './viewer-template.js';
import type { ViewerData, ViewerModule } from './viewer-template.js';
import { getArchHistory, getSnapshotContent } from './diff.js';

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function readFileOr(filePath: string, fallback: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

export async function loadViewerData(repoRoot: string, outputDir?: string): Promise<ViewerData> {
  const docsDir = outputDir ?? 'docs/architecture';
  const archDir = path.join(repoRoot, docsDir);
  const modulesDir = path.join(archDir, 'modules');

  const state = await readState(repoRoot, outputDir);
  const overview = await readFileOr(path.join(archDir, 'OVERVIEW.md'), '');

  const modules: ViewerModule[] = [];
  try {
    const files = await readdir(modulesDir);
    for (const file of files.sort()) {
      if (!file.endsWith('.md')) continue;
      const content = await readFile(path.join(modulesDir, file), 'utf-8');
      const name = file.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      modules.push({ name, slug: slugify(file.replace(/\.md$/, '')), content });
    }
  } catch {
    // no modules directory yet
  }

  const projectName = path.basename(repoRoot);
  const history = await getArchHistory(repoRoot, 20, outputDir);

  return {
    projectName,
    overview,
    modules,
    lastRunAt: state?.lastRunAt ?? null,
    history,
  };
}

export function openBrowser(url: string): void {
  const p = platform();
  const cmd = p === 'darwin' ? 'open' : p === 'win32' ? 'cmd' : 'xdg-open';
  const args = p === 'win32' ? ['/c', 'start', '', url] : [url];
  execFile(cmd, args, () => {});
}

function tryPort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(port, '127.0.0.1');
    server.on('listening', () => { server.close(() => resolve(port)); });
    server.on('error', () => reject());
  });
}

async function findPort(start: number): Promise<number> {
  for (let port = start; port < start + 20; port++) {
    try {
      return await tryPort(port);
    } catch {
      continue;
    }
  }
  throw new Error('Could not find an available port');
}

export async function startViewer(repoRoot: string, port?: number, outputDir?: string): Promise<void> {
  const data = await loadViewerData(repoRoot, outputDir);
  const html = getViewerHtml(data);
  const htmlBuffer = Buffer.from(html, 'utf-8');

  const actualPort = await findPort(port ?? 3333);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/snapshot') {
      const sha = url.searchParams.get('sha');
      if (!sha) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing sha parameter' }));
        return;
      }
      try {
        const snapshot = await getSnapshotContent(repoRoot, sha, outputDir);
        const json = JSON.stringify(snapshot);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(json),
        });
        res.end(json);
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load snapshot' }));
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': htmlBuffer.length,
    });
    res.end(htmlBuffer);
  });

  server.listen(actualPort, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${actualPort}`;
    console.log(`\n  Viewer running at ${url}`);
    console.log('  Press Ctrl+C to stop\n');
    openBrowser(url);
  });

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

export async function exportStaticHtml(
  repoRoot: string,
  outputPath?: string,
  outputDir?: string,
): Promise<string> {
  const data = await loadViewerData(repoRoot, outputDir);
  const html = getViewerHtml(data, { static: true });
  const dest = outputPath ?? path.join(repoRoot, outputDir ?? 'docs/architecture', 'index.html');
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, html);
  return dest;
}
