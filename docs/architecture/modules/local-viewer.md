# Local Viewer

> Path: `src/view.ts + src/viewer-template.ts`

Interactive HTML documentation viewer served on localhost. Loads architecture docs, renders Mermaid diagrams client-side with zoom/pan controls, provides sidebar navigation, and features a dark theme for comfortable reading.

## Key Abstractions

- ViewerData { projectName, overview, modules, lastRunAt }
- ViewerModule { name, slug, content }
- loadViewerData(repoRoot): Promise<ViewerData>
- getViewerHtml(data): string
- startViewer(repoRoot, port?): Promise<void>
- HTTP server on port 3333 (or next available)

## Internal Structure

```mermaid
flowchart TD
    Start[startViewer] --> FindPort[Find available port]
    FindPort --> Load[loadViewerData]
    Load --> ReadOverview[Read OVERVIEW.md]
    Load --> ReadModules[Read modules/*.md]
    ReadModules --> BuildData[Build ViewerData]
    BuildData --> Render[getViewerHtml]
    Render --> Inject[Inject data as JSON]
    Render --> Template[Generate HTML template]
    Template --> Server[Start HTTP server]
    Server --> Browser[Open browser]
    Browser --> ClientRender[Client-side marked + mermaid rendering]
```
