# repo-architect

Your codebase, documented. Automatically. Every night.

**repo-architect** scans your repository, analyzes it with Claude, and generates architecture documentation with Mermaid diagrams — system maps, data flows, dependency graphs, and per-module docs.

## Quick Start

```bash
npx repo-architect
```

Or with Bun:

```bash
bunx repo-architect
```

You'll need an Anthropic API key. Set it via environment variable or config file:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or save to ~/.repo-architect
```

## What You Get

```
docs/architecture/
├── OVERVIEW.md          # System map, tech stack, data flows, dependency graph
└── modules/
    ├── api.md           # Per-module docs with class diagrams
    ├── auth.md
    └── ...
```

All diagrams use [Mermaid](https://mermaid.js.org/) syntax — renders natively on GitHub.

## Usage

```bash
# Full scan (default for first run)
npx repo-architect

# Incremental update (only re-analyzes structural changes)
npx repo-architect --incremental

# Create a PR with the generated docs
npx repo-architect --pr

# View docs locally in the browser
npx repo-architect --view

# Set up a GitHub Action for nightly runs
npx repo-architect --setup

# Specify a different repo directory
npx repo-architect --dir /path/to/repo
```

## Incremental Updates

After the first full scan, repo-architect tracks state in `docs/architecture/.arch-state.json`. On subsequent runs with `--incremental`, it only re-analyzes files with structural changes (new/modified/deleted code files, config changes) and patches the existing docs.

## GitHub Action

Run `npx repo-architect --setup` to generate a workflow file that:

- Runs on a cron schedule (default: 3am daily)
- Detects structural changes since the last run
- Updates architecture docs
- Opens a PR with the changes

You'll need to add `ANTHROPIC_API_KEY` as a repository secret.

## Local Viewer

```bash
npx repo-architect --view
```

Opens an interactive HTML viewer at `http://127.0.0.1:3333` with:

- Dark theme
- Sidebar navigation
- Mermaid diagram rendering with zoom/pan controls
- Responsive layout

## Homepage

[repo-architect.com](https://repo-architect.com)

## License

MIT
