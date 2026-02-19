# Documentation Renderer

> Path: `src/render.ts`

Generates Markdown files with embedded Mermaid diagrams from analysis results. Handles full documentation generation and incremental patching of existing docs, preserving human-written content while replacing only changed sections.

## Key Abstractions

- renderFullDocs(repoRoot, analysis, outputDir)
- renderIncrementalDocs(repoRoot, analysis, outputDir)
- renderOverview(analysis): string
- renderModule(mod): string
- replaceSection(doc, sectionName, newContent): string
- IncrementalRenderResult { writtenFiles, deletedFiles }

## Internal Structure

```mermaid
flowchart TD
    A[Render Request] --> B{Full or Incremental?}
    B -->|Full| C[renderFullDocs]
    C --> D[renderOverview → OVERVIEW.md]
    C --> E[renderModule × n → modules/*.md]
    D & E --> F[Write all files]
    F --> G[Return writtenFiles[]]
    B -->|Incremental| H[renderIncrementalDocs]
    H --> I[Load existing OVERVIEW.md]
    H --> J{Overview changed?}
    J -->|yes| K[replaceSection]
    H --> L[Updated modules → write]
    H --> M[New modules → write]
    H --> N[Deleted modules → unlink]
    K & L & M & N --> O[Return writtenFiles + deletedFiles]
```
