export const howItWorks = `sequenceDiagram
    autonumber
    participant User
    participant CLI
    participant Scanner
    participant Analyzer
    participant Claude
    participant Renderer
    participant Git
    User->>CLI: npx repo-architect
    CLI->>Scanner: scanRepo(repoRoot)
    Scanner->>Scanner: Execute repomix
    Scanner-->>CLI: ScanResult(content, fileCount)
    CLI->>Analyzer: analyzeFullRepo(repoContent)
    Analyzer->>Analyzer: Load analyze-full.md prompt
    Analyzer->>Claude: messages.create(system+user)
    Claude-->>Analyzer: JSON AnalysisResult
    Analyzer-->>CLI: AnalysisResult
    CLI->>Renderer: renderFullDocs(repoRoot, analysis)
    Renderer->>Renderer: Generate OVERVIEW.md
    Renderer->>Renderer: Generate module docs
    Renderer-->>CLI: changedFiles[]
    CLI->>Git: createArchPr(files, summary)
    Git->>Git: Create branch & commit
    Git->>GitHub: gh pr create
    GitHub-->>User: Pull Request URL`;

export const galleryOverview = `graph LR
    subgraph Pipeline ["Core Pipeline"]
        CLI[cli.ts]
        Scan[scan.ts]
        Analyze[analyze.ts]
        Render[render.ts]
        State[state.ts]
        Diff[diff.ts]
        PR[pr.ts]
        Setup[setup.ts]
        Templates[prompts/]
    end
    subgraph Deps ["External Dependencies"]
        External1[Anthropic API]
        External2[Repomix]
        External3[Git/GitHub]
    end
    CLI --> Scan
    CLI --> Analyze
    CLI --> Render
    CLI --> State
    CLI --> Diff
    CLI --> PR
    CLI --> Setup
    Analyze --> Templates
    Render --> Analyze
    Diff --> State
    PR --> Diff
    Analyze -.->|"@anthropic-ai/sdk"| External1
    Scan -.->|repomix| External2
    PR -.->|"git/gh"| External3`;

export const galleryModule = `classDiagram
    class AnalysisEngine {
        <<service>>
        +analyzeFullRepo(content) AnalysisResult
        +analyzeIncremental(content, docs, changes, log) IncrementalAnalysisResult
        -getApiKey() string
        -loadPrompt(name) string
        -parseAnalysisResponse(text) AnalysisResult
        -parseIncrementalResponse(text) IncrementalAnalysisResult
    }
    class AnalysisResult {
        <<interface>>
        +projectName: string
        +overview: string
        +techStack: string[]
        +systemMap: string
        +dataFlows: string
        +dependencyGraph: string
        +modules: ModuleAnalysis[]
    }
    class IncrementalAnalysisResult {
        <<interface>>
        +updatedOverview: string | null
        +updatedSystemMap: string | null
        +updatedDataFlows: string | null
        +updatedDependencyGraph: string | null
        +updatedModules: ModuleAnalysis[]
        +newModules: ModuleAnalysis[]
        +deletedModules: string[]
    }
    class ModuleAnalysis {
        <<interface>>
        +name: string
        +path: string
        +description: string
        +keyAbstractions: string[]
        +internalDiagram: string
    }
    AnalysisEngine --> AnalysisResult
    AnalysisEngine --> IncrementalAnalysisResult
    AnalysisResult --> ModuleAnalysis
    IncrementalAnalysisResult --> ModuleAnalysis`;

export const galleryFlows = `flowchart TD
    Start[main entry] --> Parse[Parse CLI args]
    Parse --> Version{--version?}
    Version -->|yes| ShowVer[Show version & exit]
    Version -->|no| SetupCmd{setup command?}
    SetupCmd -->|yes| RunSetup[setupGitHubAction]
    SetupCmd -->|no| CheckState{State exists?}
    CheckState -->|no| Full[runFull]
    CheckState -->|yes| Incremental[runIncremental]
    subgraph FullGen ["Full Generation"]
        Full --> Scan1[scanRepo]
        Scan1 --> Analyze1[analyzeFullRepo]
        Analyze1 --> Render1[renderFullDocs]
        Render1 --> Save1[writeState]
        Save1 --> PR1{--pr flag?}
        PR1 -->|yes| CreatePR1[createArchPr]
    end
    subgraph IncrUpd ["Incremental Update"]
        Incremental --> GetDiff[getChangedFiles]
        GetDiff --> NoChanges{No structural changes?}
        NoChanges -->|yes| Skip[Skip & exit]
        NoChanges -->|no| Scan2[scanFiles]
        Scan2 --> Analyze2[analyzeIncremental]
        Analyze2 --> Render2[renderIncrementalDocs]
        Render2 --> Save2[writeState]
        Save2 --> PR2{--pr flag?}
        PR2 -->|yes| CreatePR2[createArchPr]
    end`;
