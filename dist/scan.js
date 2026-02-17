import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const execFileAsync = promisify(execFile);
export async function scanRepo(repoRoot) {
    const repomixBin = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'node_modules', '.bin', 'repomix');
    const { stdout } = await execFileAsync(repomixBin, [
        '--stdout',
        '--style', 'xml',
        '--compress',
        '--no-file-summary',
        '--no-copy-clipboard',
    ], {
        cwd: repoRoot,
        maxBuffer: 50 * 1024 * 1024, // 50MB
    });
    const fileMatches = stdout.match(/<file /g);
    const fileCount = fileMatches ? fileMatches.length : 0;
    return { content: stdout, fileCount };
}
export async function scanFiles(repoRoot, files) {
    if (files.length === 0) {
        return { content: '', fileCount: 0 };
    }
    const repomixBin = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'node_modules', '.bin', 'repomix');
    const includeArgs = files.flatMap(f => ['--include', f]);
    const { stdout } = await execFileAsync(repomixBin, [
        '--stdout',
        '--style', 'xml',
        '--compress',
        '--no-file-summary',
        '--no-copy-clipboard',
        ...includeArgs,
    ], {
        cwd: repoRoot,
        maxBuffer: 50 * 1024 * 1024,
    });
    const fileMatches = stdout.match(/<file /g);
    const fileCount = fileMatches ? fileMatches.length : 0;
    return { content: stdout, fileCount };
}
//# sourceMappingURL=scan.js.map