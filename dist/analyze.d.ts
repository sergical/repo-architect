export interface ModuleAnalysis {
    name: string;
    path: string;
    description: string;
    keyAbstractions: string[];
    internalDiagram: string;
}
export interface AnalysisResult {
    projectName: string;
    overview: string;
    techStack: string[];
    systemMap: string;
    dataFlows: string;
    dependencyGraph: string;
    modules: ModuleAnalysis[];
}
export interface IncrementalAnalysisResult {
    updatedOverview: string | null;
    updatedSystemMap: string | null;
    updatedDataFlows: string | null;
    updatedDependencyGraph: string | null;
    updatedModules: ModuleAnalysis[];
    newModules: ModuleAnalysis[];
    deletedModules: string[];
}
export declare function analyzeFullRepo(repoContent: string): Promise<AnalysisResult>;
export declare function analyzeIncremental(repoContent: string, existingDocs: string, changeSummary: string, gitLog: string): Promise<IncrementalAnalysisResult>;
