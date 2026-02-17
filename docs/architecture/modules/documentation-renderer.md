# Documentation Renderer

> Path: `src/render.ts`

Generates Markdown files with Mermaid diagrams from analysis results. Handles both full documentation generation and incremental updates that patch existing docs by replacing specific sections while preserving human-written content.

## Key Abstractions

- renderFullDocs(repoRoot, analysis): Promise<string[]>
- renderIncrementalDocs(repoRoot, analysis): Promise<string[]>
- renderOverview(analysis): string
- renderModule(mod): string
- replaceSection(doc, sectionName, newContent): string

## Internal Structure

```mermaid
flowchart TD
    Start[Render Request] --> Type{Full or<br/>Incremental?}
    
    Type -->|Full| RenderFull[renderFullDocs]
    RenderFull --> GenOverview[Generate OVERVIEW.md]
    RenderFull --> GenModules[Generate module docs]
    GenModules --> WriteFiles1[Write all files to disk]
    
    Type -->|Incremental| RenderIncr[renderIncrementalDocs]
    RenderIncr --> LoadExisting[Read existing docs]
    RenderIncr --> PatchOverview{Overview<br/>changed?}
    PatchOverview -->|yes| ReplaceOv[replaceSection in OVERVIEW]
    RenderIncr --> PatchModules[Update/add/delete modules]
    PatchModules --> WriteFiles2[Write changed files]
    
    WriteFiles1 --> Return[Return changedFiles[]]
    WriteFiles2 --> Return
```
