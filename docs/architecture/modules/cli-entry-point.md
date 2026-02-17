# CLI Entry Point

> Path: `src/cli.ts`

Main command-line interface that orchestrates the entire documentation pipeline. Handles argument parsing, mode selection (full vs incremental), and coordinates all modules to execute the scan-analyze-render-PR workflow.

## Key Abstractions

- Command (commander.js)
- runFull(repoRoot, createPr)
- runIncremental(repoRoot, createPr)
- main() orchestration function

## Internal Structure

```mermaid
flowchart TD
    Start[main entry] --> Parse[Parse CLI args]
    Parse --> Version{--version?}
    Version -->|yes| ShowVer[Show version & exit]
    Version -->|no| Setup{setup command?}
    
    Setup -->|yes| RunSetup[setupGitHubAction]
    Setup -->|no| View{--view?}
    View -->|yes| StartViewer[startViewer]
    View -->|no| CheckState{State exists?}
    
    CheckState -->|yes| Incremental[runIncremental]
    CheckState -->|no| Full[runFull]
    
    Full --> Scan1[scanRepo]
    Scan1 --> Analyze1[analyzeFullRepo]
    Analyze1 --> Render1[renderFullDocs]
    Render1 --> Save1[writeState]
    Save1 --> PR1{--pr flag?}
    PR1 -->|yes| CreatePR1[createArchPr]
    
    Incremental --> Diff[getChangedFiles]
    Diff --> NoChanges{No structural<br/>changes?}
    NoChanges -->|yes| Skip[Skip & exit]
    NoChanges -->|no| Scan2[scanFiles]
    Scan2 --> Analyze2[analyzeIncremental]
    Analyze2 --> Render2[renderIncrementalDocs]
    Render2 --> Save2[writeState]
    Save2 --> PR2{--pr flag?}
    PR2 -->|yes| CreatePR2[createArchPr]
```
