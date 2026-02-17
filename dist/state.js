import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const STATE_FILE = 'docs/architecture/.arch-state.json';
export async function readState(repoRoot) {
    const statePath = path.join(repoRoot, STATE_FILE);
    try {
        const raw = await readFile(statePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export async function writeState(repoRoot, state) {
    const statePath = path.join(repoRoot, STATE_FILE);
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
}
//# sourceMappingURL=state.js.map