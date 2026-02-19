# AI Analysis Engine

> Path: `src/analyze.ts`

Interfaces with the Anthropic Claude API to analyze repository content and generate structured architecture documentation as JSON. Handles both full analysis and incremental delta updates, with robust JSON extraction including XML-tag fallback parsing.

## Key Abstractions

- AnalysisResult
- IncrementalAnalysisResult
- ModuleAnalysis
- TokenUsage
- AnalyzeOptions
- analyzeFullRepo(content, options)
- analyzeIncremental(content, existingDocs, changeSummary, gitLog, options)
- parseAnalysisResponse(text)
- parseIncrementalResponse(text)
- validateMermaid(diagram)
- extractJson(text)
- DEFAULT_MODEL

## Internal Structure

```mermaid
classDiagram
    class AnalysisEngine {
        +analyzeFullRepo(content, options) AnalysisResult
        +analyzeIncremental(content, docs, changes, log) IncrementalAnalysisResult
        +parseAnalysisResponse(text) AnalysisResult
        +parseIncrementalResponse(text) IncrementalAnalysisResult
        +validateMermaid(diagram) string
        -getApiKey(repoRoot) string
        -loadPrompt(name) string
        -extractJson(text) unknown
        -extractSection(text, tag) string
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
        +string|"null updatedOverview
        +string"|null updatedSystemMap
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
