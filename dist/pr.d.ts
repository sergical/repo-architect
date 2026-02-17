export interface PrResult {
    branch: string;
    prUrl: string | null;
}
export declare function createArchPr(repoRoot: string, changedFiles: string[], summary: string): Promise<PrResult>;
