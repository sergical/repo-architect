import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250514';

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

async function getApiKey(): Promise<string> {
  // 1. Environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // 2. Config file at ~/.repo-architect
  const home = process.env.HOME || process.env.USERPROFILE || '';
  for (const configPath of [
    path.join(home, '.repo-architect'),
    path.join(home, '.anthropic', 'api_key'),
  ]) {
    try {
      const key = (await readFile(configPath, 'utf-8')).trim();
      if (key) return key;
    } catch {
      // file doesn't exist
    }
  }

  throw new Error(
    'No Anthropic API key found.\n' +
    'Set ANTHROPIC_API_KEY env var, or save it to ~/.repo-architect\n' +
    'Get one at https://console.anthropic.com/settings/keys'
  );
}

async function loadPrompt(name: string): Promise<string> {
  const promptPath = path.join(__dirname, '..', 'prompts', `${name}.md`);
  return readFile(promptPath, 'utf-8');
}

export async function analyzeFullRepo(repoContent: string, model?: string): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: await getApiKey(), maxRetries: 3 });
  const systemPrompt = await loadPrompt('analyze-full');

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: model ?? DEFAULT_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this repository and generate architecture documentation.\n\n${repoContent}`,
        },
      ],
    });
  } catch (err) {
    throw wrapApiError(err);
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  return parseAnalysisResponse(text);
}

export async function analyzeIncremental(
  repoContent: string,
  existingDocs: string,
  changeSummary: string,
  gitLog: string,
  model?: string,
): Promise<IncrementalAnalysisResult> {
  const client = new Anthropic({ apiKey: await getApiKey(), maxRetries: 3 });
  const systemPrompt = await loadPrompt('analyze-incremental');

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: model ?? DEFAULT_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            '## Changes Since Last Run',
            changeSummary,
            '',
            '## Git Log',
            gitLog,
            '',
            '## Existing Architecture Docs',
            existingDocs,
            '',
            '## Current Repository Content',
            repoContent,
          ].join('\n'),
        },
      ],
    });
  } catch (err) {
    throw wrapApiError(err);
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  return parseIncrementalResponse(text);
}

function wrapApiError(err: unknown): Error {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 401) {
      return new Error(
        'Invalid API key. Check your ANTHROPIC_API_KEY or ~/.repo-architect file.\n' +
        'Get a key at https://console.anthropic.com/settings/keys'
      );
    }
    if (err.status === 429) {
      return new Error(
        'Rate limited by the Anthropic API. Wait a minute and try again, or check your plan limits at https://console.anthropic.com'
      );
    }
    return new Error(`Anthropic API error (${err.status}): ${err.message}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

const VALID_MERMAID_TYPES = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block)/;

export function validateMermaid(diagram: string): string {
  const trimmed = diagram.trim();
  if (!trimmed) return '';

  if (VALID_MERMAID_TYPES.test(trimmed)) return trimmed;

  // Heuristic: has arrows but no declaration — prepend graph TD
  if (trimmed.includes('-->') || trimmed.includes('---')) {
    console.warn('  Warning: Mermaid diagram missing type declaration, prepending "graph TD"');
    return `graph TD\n${trimmed}`;
  }

  console.warn('  Warning: Invalid mermaid diagram content, skipping');
  return '';
}

export function parseAnalysisResponse(text: string): AnalysisResult {
  const json = extractJson(text);
  if (json) {
    const result = json as AnalysisResult;
    result.systemMap = validateMermaid(result.systemMap);
    result.dataFlows = validateMermaid(result.dataFlows);
    result.dependencyGraph = validateMermaid(result.dependencyGraph);
    for (const mod of result.modules) {
      mod.internalDiagram = validateMermaid(mod.internalDiagram);
    }
    return result;
  }

  return {
    projectName: extractSection(text, 'PROJECT_NAME') || 'Unknown Project',
    overview: extractSection(text, 'OVERVIEW') || text,
    techStack: extractList(text, 'TECH_STACK'),
    systemMap: validateMermaid(extractSection(text, 'SYSTEM_MAP') || ''),
    dataFlows: validateMermaid(extractSection(text, 'DATA_FLOWS') || ''),
    dependencyGraph: validateMermaid(extractSection(text, 'DEPENDENCY_GRAPH') || ''),
    modules: extractModules(text),
  };
}

export function parseIncrementalResponse(text: string): IncrementalAnalysisResult {
  const json = extractJson(text);
  if (json) {
    const result = json as IncrementalAnalysisResult;
    if (result.updatedSystemMap) result.updatedSystemMap = validateMermaid(result.updatedSystemMap);
    if (result.updatedDataFlows) result.updatedDataFlows = validateMermaid(result.updatedDataFlows);
    if (result.updatedDependencyGraph) result.updatedDependencyGraph = validateMermaid(result.updatedDependencyGraph);
    for (const mod of [...(result.updatedModules || []), ...(result.newModules || [])]) {
      mod.internalDiagram = validateMermaid(mod.internalDiagram);
    }
    return result;
  }

  return {
    updatedOverview: extractSection(text, 'UPDATED_OVERVIEW'),
    updatedSystemMap: validateMermaid(extractSection(text, 'UPDATED_SYSTEM_MAP') || '') || null,
    updatedDataFlows: validateMermaid(extractSection(text, 'UPDATED_DATA_FLOWS') || '') || null,
    updatedDependencyGraph: validateMermaid(extractSection(text, 'UPDATED_DEPENDENCY_GRAPH') || '') || null,
    updatedModules: extractModules(text),
    newModules: [],
    deletedModules: [],
  };
}

function extractJson(text: string): unknown | null {
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // not valid JSON
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractSection(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractList(text: string, tag: string): string[] {
  const section = extractSection(text, tag);
  if (!section) return [];
  return section.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}

function extractModules(text: string): ModuleAnalysis[] {
  const modules: ModuleAnalysis[] = [];
  const moduleRegex = /<MODULE>([\s\S]*?)<\/MODULE>/gi;
  let match;

  while ((match = moduleRegex.exec(text)) !== null) {
    const block = match[1];
    modules.push({
      name: extractSection(block, 'NAME') || 'unknown',
      path: extractSection(block, 'PATH') || '',
      description: extractSection(block, 'DESCRIPTION') || '',
      keyAbstractions: extractList(block, 'KEY_ABSTRACTIONS'),
      internalDiagram: extractSection(block, 'INTERNAL_DIAGRAM') || '',
    });
  }

  return modules;
}
