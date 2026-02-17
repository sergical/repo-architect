# Git Diff Tracker

> Path: `src/diff.ts`

Analyzes git history to identify structural changes since the last documentation run. Classifies changes as structural (requiring re-analysis) or ignorable (tests, configs, docs) to minimize unnecessary AI API calls.

## Key Abstractions

- StructuralChange { file, changeType, isStructural }
- DiffResult { changes, currentSha, summary }
- getChangedFiles(repoRoot, sinceSha): Promise<DiffResult>
- isStructuralFile(filepath): boolean
- getGitLogSummary(repoRoot, sinceSha): Promise<string>

## Internal Structure

```mermaid
flowchart TD
    Start[getChangedFiles] --> GetSha[getCurrentSha]
    GetSha --> Diff[git diff-tree]
    Diff --> Parse[Parse output]
    Parse --> Classify{For each file}
    Classify --> Check[isStructuralFile?]
    Check -->|src/*.ts| Structural[Mark structural=true]
    Check -->|test/doc| Ignore[Mark structural=false]
    Structural --> Collect[Collect changes]
    Ignore --> Collect
    Collect --> Summary[Generate summary]
    Summary --> Return[DiffResult]
```
