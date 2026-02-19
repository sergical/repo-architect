import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface ModuleInfo {
  name: string;
  path: string;
  description: string;
}

export interface ArchState {
  lastCommitSha: string;
  lastRunAt: string;
  modules: ModuleInfo[];
  repoRoot: string;
}

const DEFAULT_STATE_DIR = 'docs/architecture';

export async function readState(repoRoot: string, outputDir?: string): Promise<ArchState | null> {
  const statePath = path.join(repoRoot, outputDir ?? DEFAULT_STATE_DIR, '.arch-state.json');
  try {
    const raw = await readFile(statePath, 'utf-8');
    return JSON.parse(raw) as ArchState;
  } catch {
    return null;
  }
}

export async function writeState(repoRoot: string, state: ArchState, outputDir?: string): Promise<void> {
  const statePath = path.join(repoRoot, outputDir ?? DEFAULT_STATE_DIR, '.arch-state.json');
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
}
