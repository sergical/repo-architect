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

function isStructuralFile(filepath: string): boolean {
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
