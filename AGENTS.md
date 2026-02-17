# Agent Instructions

## Package Manager
Use **bun**: `bun install`, `bun run build`, `bun test`

## Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Compile TypeScript to `dist/` |
| `bun run dev` | Watch mode (`tsc --watch`) |
| `bun test` | Run tests (`vitest run`) |
| `bun run test:watch` | Watch mode tests |
| `bun run typecheck` | Type-check without emitting |
| `bun dist/cli.js` | Run CLI locally (build first) |
| `npx repo-architect` | Run via npx |
| `bunx repo-architect` | Run via bunx |

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

## Architecture
- Pipeline: **scan → analyze → render → PR**
- `src/cli.ts` — CLI entry point (Commander), orchestrates pipeline
- `src/index.ts` — Library entry point, re-exports public APIs
- `src/scan.ts` — Wraps `repomix` binary for XML output
- `src/analyze.ts` — Anthropic API calls (claude-sonnet-4-5), JSON response parsing with XML-tag fallback
- `src/render.ts` — Generates Markdown + Mermaid under `docs/architecture/`
- `src/state.ts` — Run state persistence (`docs/architecture/.arch-state.json`)
- `src/diff.ts` — Git diff, classifies structural vs ignorable changes
- `src/pr.ts` — Branch creation, commit, push, PR via `gh`
- `src/setup.ts` — GitHub Actions workflow setup
- `src/view.ts` + `src/viewer-template.ts` — Local HTTP viewer with Mermaid rendering

## Key Conventions
- **ESM-only** — `.js` extensions in all imports
- **Prompts are external** — `prompts/analyze-full.md`, `prompts/analyze-incremental.md`
- **Tests excluded from build** — `tsconfig.json` excludes `src/**/*.test.ts`
- **API key** — `ANTHROPIC_API_KEY` env var or `~/.repo-architect` file

## Diagrams
Use `mermaid-diagrams` skill for diagram work. See `.agents/skills/mermaid-diagrams/SKILL.md`

## Browser Automation
Use `agent-browser` skill. See `.agents/skills/agent-browser/SKILL.md`

## Frontend/UI
Use `frontend-design` skill. See `.agents/skills/frontend-design/SKILL.md`
