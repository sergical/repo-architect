export interface ModuleInfo {
    name: string;
    path: string;
    description: string;
}
export interface ArchState {
    lastCommitSha: string;
    lastRunAt: string;
    modules: ModuleInfo[];
    repoRoot: string;
}
export declare function readState(repoRoot: string): Promise<ArchState | null>;
export declare function writeState(repoRoot: string, state: ArchState): Promise<void>;
