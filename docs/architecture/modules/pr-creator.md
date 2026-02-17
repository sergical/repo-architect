# PR Creator

> Path: `src/pr.ts`

Automates the GitHub pull request workflow for documentation updates. Creates a branch, commits changed files, pushes to remote, and opens a PR using the gh CLI tool.

## Key Abstractions

- PrResult { branch, prUrl }
- createArchPr(repoRoot, changedFiles, summary): Promise<PrResult>
- isGhInstalled(): Promise<boolean>
- Branch naming: arch-docs-YYYYMMDD-HHMMSS

## Internal Structure

```mermaid
sequenceDiagram
    participant CLI
    participant PR
    participant Git
    participant GitHub
    
    CLI->>PR: createArchPr(files, summary)
    PR->>PR: Check gh installed
    PR->>Git: Create branch arch-docs-*
    PR->>Git: git add files
    PR->>Git: git commit
    PR->>Git: git push origin branch
    PR->>GitHub: gh pr create
    GitHub-->>PR: PR URL
    PR-->>CLI: PrResult
```
