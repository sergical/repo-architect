import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface StructuralChange {
  file: string;
  changeType: 'added' | 'deleted' | 'modified' | 'renamed';
  isStructural: boolean;
}

export interface DiffResult {
  changes: StructuralChange[];
  currentSha: string;
  summary: string;
}

const STRUCTURAL_PATTERNS = [
  /\.(ts|tsx|js|jsx|py|go|rs|java|rb|swift|kt)$/,
  /package\.json$/,
  /tsconfig.*\.json$/,
  /Cargo\.toml$/,
  /go\.mod$/,
  /pyproject\.toml$/,
  /requirements.*\.txt$/,
  /Dockerfile/,
  /docker-compose/,
  /\.github\/workflows\//,
];

const IGNORE_PATTERNS = [
  /\.lock$/,
  /lock\.json$/,
  /node_modules/,
  /dist\//,
  /build\//,
  /\.min\./,
  /\.map$/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /docs\/architecture\//,
];

export function isStructuralFile(filepath: string): boolean {
  if (IGNORE_PATTERNS.some(p => p.test(filepath))) return false;
  return STRUCTURAL_PATTERNS.some(p => p.test(filepath));
}

export async function getCurrentSha(repoRoot: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  return stdout.trim();
}

export async function getChangedFiles(repoRoot: string, sinceSha: string): Promise<DiffResult> {
  const currentSha = await getCurrentSha(repoRoot);

  if (sinceSha === currentSha) {
    return { changes: [], currentSha, summary: 'No changes since last run.' };
  }

  const { stdout } = await execFileAsync('git', [
    'diff', '--name-status', sinceSha, currentSha,
  ], { cwd: repoRoot });

  const changes: StructuralChange[] = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [status, ...parts] = line.split('\t');
      const file = parts[parts.length - 1];
      const changeType = status.startsWith('R') ? 'renamed' as const
        : status === 'A' ? 'added' as const
        : status === 'D' ? 'deleted' as const
        : 'modified' as const;

      return {
        file,
        changeType,
        isStructural: isStructuralFile(file),
      };
    });

  const structural = changes.filter(c => c.isStructural);
  const summary = structural.length === 0
    ? 'No structural changes detected.'
    : `${structural.length} structural change(s): ${structural.map(c => `${c.changeType} ${c.file}`).join(', ')}`;

  return { changes, currentSha, summary };
}

export async function getGitLogSummary(repoRoot: string, sinceSha: string): Promise<string> {
  const { stdout } = await execFileAsync('git', [
    'log', '--oneline', '--no-decorate', `${sinceSha}..HEAD`,
  ], { cwd: repoRoot });
  return stdout.trim();
}

export interface ArchSnapshot {
  commitSha: string;
  date: string;
  summary: string;
  moduleCount: number;
}

export async function getArchHistory(repoRoot: string, limit = 20): Promise<ArchSnapshot[]> {
  let logOutput: string;
  try {
    const { stdout } = await execFileAsync('git', [
      'log', `--max-count=${limit}`, '--format=%H|%aI|%s', '--', 'docs/architecture/OVERVIEW.md',
    ], { cwd: repoRoot });
    logOutput = stdout.trim();
  } catch {
    return [];
  }

  if (!logOutput) return [];

  const lines = logOutput.split('\n').filter(Boolean);
  const snapshots: ArchSnapshot[] = [];

  for (const line of lines) {
    const [commitSha, date, ...summaryParts] = line.split('|');
    const summary = summaryParts.join('|');

    let moduleCount = 0;
    try {
      const { stdout } = await execFileAsync('git', [
        'ls-tree', '--name-only', commitSha, 'docs/architecture/modules/',
      ], { cwd: repoRoot });
      moduleCount = stdout.trim().split('\n').filter(f => f.endsWith('.md')).length;
    } catch {
      // modules dir may not exist at this commit
    }

    snapshots.push({ commitSha, date, summary, moduleCount });
  }

  return snapshots;
}

export async function getSnapshotContent(
  repoRoot: string,
  commitSha: string,
): Promise<{ overview: string; modules: { name: string; slug: string; content: string }[] }> {
  let overview = '';
  try {
    const { stdout } = await execFileAsync('git', [
      'show', `${commitSha}:docs/architecture/OVERVIEW.md`,
    ], { cwd: repoRoot });
    overview = stdout;
  } catch {
    // OVERVIEW.md may not exist at this commit
  }

  const modules: { name: string; slug: string; content: string }[] = [];
  try {
    const { stdout: fileList } = await execFileAsync('git', [
      'ls-tree', '--name-only', commitSha, 'docs/architecture/modules/',
    ], { cwd: repoRoot });

    const files = fileList.trim().split('\n').filter(f => f.endsWith('.md')).sort();

    for (const filePath of files) {
      const file = filePath.replace(/^docs\/architecture\/modules\//, '');
      try {
        const { stdout: content } = await execFileAsync('git', [
          'show', `${commitSha}:${filePath}`,
        ], { cwd: repoRoot });
        const baseName = file.replace(/\.md$/, '');
        const name = baseName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        modules.push({ name, slug, content });
      } catch {
        // file may not be readable at this commit
      }
    }
  } catch {
    // modules dir may not exist at this commit
  }

  return { overview, modules };
}
