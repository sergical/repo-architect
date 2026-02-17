import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export async function analyzeFullRepo(repoContent: string): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: await getApiKey() });
  const systemPrompt = await loadPrompt('analyze-full');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this repository and generate architecture documentation.\n\n${repoContent}`,
      },
    ],
  });

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
): Promise<IncrementalAnalysisResult> {
  const client = new Anthropic({ apiKey: await getApiKey() });
  const systemPrompt = await loadPrompt('analyze-incremental');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
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

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  return parseIncrementalResponse(text);
}

function parseAnalysisResponse(text: string): AnalysisResult {
  const json = extractJson(text);
  if (json) {
    return json as AnalysisResult;
  }

  return {
    projectName: extractSection(text, 'PROJECT_NAME') || 'Unknown Project',
    overview: extractSection(text, 'OVERVIEW') || text,
    techStack: extractList(text, 'TECH_STACK'),
    systemMap: extractSection(text, 'SYSTEM_MAP') || '',
    dataFlows: extractSection(text, 'DATA_FLOWS') || '',
    dependencyGraph: extractSection(text, 'DEPENDENCY_GRAPH') || '',
    modules: extractModules(text),
  };
}

function parseIncrementalResponse(text: string): IncrementalAnalysisResult {
  const json = extractJson(text);
  if (json) {
    return json as IncrementalAnalysisResult;
  }

  return {
    updatedOverview: extractSection(text, 'UPDATED_OVERVIEW'),
    updatedSystemMap: extractSection(text, 'UPDATED_SYSTEM_MAP'),
    updatedDataFlows: extractSection(text, 'UPDATED_DATA_FLOWS'),
    updatedDependencyGraph: extractSection(text, 'UPDATED_DEPENDENCY_GRAPH'),
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
