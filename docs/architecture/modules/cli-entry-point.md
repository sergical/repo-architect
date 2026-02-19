# CLI Entry Point

> Path: `src/cli.ts`

Main command-line interface built with Commander.js that orchestrates the entire scan → analyze → render → PR pipeline. Handles argument parsing, mode selection (full, incremental, dry-run, view, setup, export), cost estimation, and coordinates all other modules.

## Key Abstractions

- runFull(repoRoot, createPr, model, config)
- runIncremental(repoRoot, createPr, model, config)
- runDryRun(repoRoot, model, config)
- estimateCost(usage, model)
- formatUsage(usage, model)
- RepoArchitectConfig

## Internal Structure

```mermaid
flowchart TD
    Entry[main] --> ParseArgs[Parse CLI Args]
    ParseArgs --> LoadConfig[loadConfig]
    LoadConfig --> Mode{Mode?}
    Mode -->|setup| Setup[setupGitHubAction]
    Mode -->|--view| Viewer[startViewer]
    Mode -->|--export| Export[exportStaticHtml]
    Mode -->|--dry-run| DryRun[runDryRun]
    Mode -->|state exists| Incremental[runIncremental]
    Mode -->|no state| Full[runFull]
    Full --> S1[scanRepo]
    S1 --> S2[analyzeFullRepo]
    S2 --> S3[renderFullDocs]
    S3 --> S4[writeState]
    S4 --> S5{--pr?}
    S5 -->|yes| PR[createArchPr]
    Incremental --> I1[getChangedFiles]
    I1 --> I2{Structural<br/>changes?}
    I2 -->|no| Skip[Exit early]
    I2 -->|yes| I3[scanFiles]
    I3 --> I4[analyzeIncremental]
    I4 --> I5[renderIncrementalDocs]
    I5 --> I6[writeState]
```
