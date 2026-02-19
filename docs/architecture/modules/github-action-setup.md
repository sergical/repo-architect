# GitHub Action Setup

> Path: `src/setup.ts`

Interactive setup wizard that generates a GitHub Actions workflow file for nightly documentation updates. Prompts for cron schedule and branch name, then creates `.github/workflows/arch-docs.yml`.

## Key Abstractions

- setupGitHubAction(repoRoot): Promise<void>
- ask(question): Promise<string>
- Workflow template with cron schedule
- ANTHROPIC_API_KEY secret requirement

## Internal Structure

```mermaid
flowchart TD
    Start[setupGitHubAction] --> Prompt1[Ask: cron schedule]
    Prompt1 --> Prompt2[Ask: branch name]
    Prompt2 --> Generate[Generate workflow YAML]
    Generate --> Write[Write .github/workflows/arch-docs.yml]
    Write --> Instructions[Show setup instructions]
    Instructions --> Secrets[Remind: Add ANTHROPIC_API_KEY secret]
```
