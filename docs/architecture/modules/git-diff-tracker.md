# Git Diff Tracker

> Path: `src/diff.ts`

Analyzes git history to identify structural changes since the last documentation run. Classifies file changes as structural (requiring re-analysis) or ignorable (tests, docs, configs) to minimize unnecessary Claude API calls. Also provides architecture history snapshots.

## Key Abstractions

- StructuralChange { file, changeType, isStructural }
- DiffResult { changes, currentSha, summary }
- ArchSnapshot { commitSha, date, summary, moduleCount }
- getChangedFiles(repoRoot, sinceSha)
- isStructuralFile(filepath): boolean
- getCurrentSha(repoRoot)
- getGitLogSummary(repoRoot, sinceSha)
- getArchHistory(repoRoot, limit, outputDir)
- getSnapshotContent(repoRoot, commitSha, outputDir)

## Internal Structure

```mermaid
flowchart TD
    A[getChangedFiles] --> B[getCurrentSha]
    B --> C[git diff-tree since lastSha]
    C --> D[Parse changed files]
    D --> E{For each file}
    E --> F[isStructuralFile?]
    F -->|"src/*.ts, package.json"| G[structural=true]
    F -->|"*.test.ts, docs/, *.md"| H[structural=false]
    G & H --> I[Collect StructuralChange[]]
    I --> J[getGitLogSummary]
    J --> K[DiffResult]
```
