# AI Analysis Engine

> Path: `src/analyze.ts`

Interfaces with the Anthropic Claude API to analyze repository content and generate structured architecture documentation. Handles both full analysis and incremental updates, with robust JSON parsing including XML-tag fallback extraction.

## Key Abstractions

- AnalysisResult (project overview, diagrams, modules)
- IncrementalAnalysisResult (delta updates)
- ModuleAnalysis (per-module documentation)
- analyzeFullRepo(content): Promise<AnalysisResult>
- analyzeIncremental(content, docs, changes, log): Promise<IncrementalAnalysisResult>
- extractJson() with XML-tag fallback

## Internal Structure

```mermaid
classDiagram
    class AnalysisEngine {
        +analyzeFullRepo(content) AnalysisResult
        +analyzeIncremental(content, docs, changes, log) IncrementalAnalysisResult
        -getApiKey() string
        -loadPrompt(name) string
        -parseAnalysisResponse(text) AnalysisResult
        -parseIncrementalResponse(text) IncrementalAnalysisResult
    }
    class AnalysisResult {
        +string projectName
        +string overview
        +string[] techStack
        +string systemMap
        +string dataFlows
        +string dependencyGraph
        +ModuleAnalysis[] modules
    }
    class IncrementalAnalysisResult {
        +string|null updatedOverview
        +string|null updatedSystemMap
        +string|null updatedDataFlows
        +string|null updatedDependencyGraph
        +ModuleAnalysis[] updatedModules
        +ModuleAnalysis[] newModules
        +string[] deletedModules
    }
    class ModuleAnalysis {
        +string name
        +string path
        +string description
        +string[] keyAbstractions
        +string internalDiagram
    }
    AnalysisEngine --> AnalysisResult
    AnalysisEngine --> IncrementalAnalysisResult
    AnalysisResult --> ModuleAnalysis
    IncrementalAnalysisResult --> ModuleAnalysis
```
