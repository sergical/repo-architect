export interface StructuralChange {
    file: string;
    changeType: 'added' | 'deleted' | 'modified' | 'renamed';
    isStructural: boolean;
}
export interface DiffResult {
    changes: StructuralChange[];
    currentSha: string;
    summary: string;
}
export declare function getCurrentSha(repoRoot: string): Promise<string>;
export declare function getChangedFiles(repoRoot: string, sinceSha: string): Promise<DiffResult>;
export declare function getGitLogSummary(repoRoot: string, sinceSha: string): Promise<string>;
