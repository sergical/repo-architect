# PR Creator

> Path: `src/pr.ts`

Automates the GitHub pull request workflow for documentation updates. Creates a timestamped branch, commits changed files, pushes to remote, and opens a PR using the `gh` CLI tool.

## Key Abstractions

- PrResult { branch, prUrl }
- createArchPr(repoRoot, changedFiles, summary, docsPath?)
- isGhInstalled(): boolean
- Branch naming: arch-docs-YYYYMMDD-HHMMSS

## Internal Structure

```mermaid
sequenceDiagram
    participant CLI
    participant PR
    participant Git
    participant GitHub
    CLI->>PR: createArchPr(files, summary)
    PR->>PR: isGhInstalled?
    PR->>Git: git checkout -b arch-docs-*
    PR->>Git: git add changedFiles
    PR->>Git: git commit -m message
    PR->>Git: git push origin branch
    PR->>GitHub: gh pr create --title --body
    GitHub-->>PR: PR URL
    PR-->>CLI: PrResult {branch, prUrl}
```
