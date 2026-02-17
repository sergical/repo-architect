# State Manager

> Path: `src/state.ts`

Persists run state to enable incremental updates. Tracks the last commit SHA, timestamp, and module inventory to detect what has changed between runs.

## Key Abstractions

- ArchState { lastCommitSha, lastRunAt, modules, repoRoot }
- ModuleInfo { name, path, description }
- readState(repoRoot): Promise<ArchState|null>
- writeState(repoRoot, state): Promise<void>
- State file: docs/architecture/.arch-state.json

## Internal Structure

```mermaid
classDiagram
    class StateManager {
        +readState(repoRoot) ArchState|null
        +writeState(repoRoot, state) void
    }
    class ArchState {
        +string lastCommitSha
        +string lastRunAt
        +ModuleInfo[] modules
        +string repoRoot
    }
    class ModuleInfo {
        +string name
        +string path
        +string description
    }
    StateManager --> ArchState
    ArchState --> ModuleInfo
    StateManager ..> FileSystem : .arch-state.json
```
