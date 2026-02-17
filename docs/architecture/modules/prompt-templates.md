# Prompt Templates

> Path: `prompts/`

External prompt templates for Claude AI that define the analysis instructions. Separate files for full analysis and incremental updates ensure consistent, structured output from the LLM.

## Key Abstractions

- analyze-full.md - Initial repository analysis prompt
- analyze-incremental.md - Delta update analysis prompt
- templates/overview.md - Documentation template
- templates/module.md - Module documentation template
- JSON schema enforcement via prompts

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
