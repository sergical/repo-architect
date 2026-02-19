# Prompt Templates

> Path: `prompts/`

External Markdown prompt files for Claude AI that define the analysis instructions and JSON schema requirements. Separate files for full analysis and incremental updates ensure consistent, structured output from the LLM.

## Key Abstractions

- analyze-full.md - Initial repository analysis prompt with JSON schema
- analyze-incremental.md - Delta update analysis prompt
- templates/overview.md - OVERVIEW.md Markdown template
- templates/module.md - Per-module Markdown template

## Internal Structure

```mermaid
graph TD
    Analyzer[analyze.ts] --> Load[loadPrompt]
    Load --> Full[analyze-full.md]
    Load --> Incr[analyze-incremental.md]
    Full --> Schema1[JSON schema definition]
    Incr --> Schema2[JSON schema definition]
    Schema1 --> Claude[Claude API]
    Schema2 --> Claude
    Claude --> Response[Structured JSON response]
    Renderer[render.ts] --> TplOverview[templates/overview.md]
    Renderer --> TplModule[templates/module.md]
    TplOverview --> Markdown[Generated docs]
    TplModule --> Markdown
```
