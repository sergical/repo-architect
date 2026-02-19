import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export interface ScanResult {
  content: string;
  fileCount: number;
}

export interface ScanOptions {
  ignore?: string[];
  include?: string[];
}

function getRepomixBin(): string {
  return path.join(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    'node_modules',
    '.bin',
    'repomix',
  );
}

function wrapScanError(err: unknown): Error {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ENOENT') {
    return new Error(
      'repomix binary not found. Run `bun install` or `npm install` to install dependencies.'
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

export async function scanRepo(repoRoot: string, options?: ScanOptions): Promise<ScanResult> {
  const args = [
    '--stdout',
    '--style', 'xml',
    '--compress',
    '--no-file-summary',
  ];

  if (options?.ignore) {
    for (const pattern of options.ignore) {
      args.push('--ignore', pattern);
    }
  }
  if (options?.include) {
    for (const pattern of options.include) {
      args.push('--include', pattern);
    }
  }

  let stdout: string;
  try {
    const result = await execFileAsync(getRepomixBin(), args, {
      cwd: repoRoot,
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });
    stdout = result.stdout;
  } catch (err) {
    throw wrapScanError(err);
  }

  const fileMatches = stdout.match(/<file /g);
  const fileCount = fileMatches ? fileMatches.length : 0;

  return { content: stdout, fileCount };
}

export async function scanFiles(repoRoot: string, files: string[]): Promise<ScanResult> {
  if (files.length === 0) {
    return { content: '', fileCount: 0 };
  }

  const includeArgs = files.flatMap(f => ['--include', f]);

  let stdout: string;
  try {
    const result = await execFileAsync(getRepomixBin(), [
      '--stdout',
      '--style', 'xml',
      '--compress',
      '--no-file-summary',
      ...includeArgs,
    ], {
      cwd: repoRoot,
      maxBuffer: 50 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err) {
    throw wrapScanError(err);
  }

  const fileMatches = stdout.match(/<file /g);
  const fileCount = fileMatches ? fileMatches.length : 0;

  return { content: stdout, fileCount };
}
