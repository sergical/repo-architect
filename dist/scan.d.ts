export interface ScanResult {
    content: string;
    fileCount: number;
}
export declare function scanRepo(repoRoot: string): Promise<ScanResult>;
export declare function scanFiles(repoRoot: string, files: string[]): Promise<ScanResult>;
