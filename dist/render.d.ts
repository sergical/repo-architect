import type { AnalysisResult, IncrementalAnalysisResult } from './analyze.js';
export declare function renderFullDocs(repoRoot: string, analysis: AnalysisResult): Promise<string[]>;
export declare function renderIncrementalDocs(repoRoot: string, analysis: IncrementalAnalysisResult): Promise<string[]>;
