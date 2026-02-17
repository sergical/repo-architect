import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function getApiKey() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
        throw new Error('No Anthropic API key found. Set ANTHROPIC_API_KEY environment variable.\n' +
            'Get one at https://console.anthropic.com/settings/keys');
    }
    return key;
}
async function loadPrompt(name) {
    const promptPath = path.join(__dirname, '..', 'prompts', `${name}.md`);
    return readFile(promptPath, 'utf-8');
}
export async function analyzeFullRepo(repoContent) {
    const client = new Anthropic({ apiKey: getApiKey() });
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
        .filter((block) => block.type === 'text')
        .map(block => block.text)
        .join('');
    return parseAnalysisResponse(text);
}
export async function analyzeIncremental(repoContent, existingDocs, changeSummary, gitLog) {
    const client = new Anthropic({ apiKey: getApiKey() });
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
        .filter((block) => block.type === 'text')
        .map(block => block.text)
        .join('');
    return parseIncrementalResponse(text);
}
function parseAnalysisResponse(text) {
    const json = extractJson(text);
    if (json) {
        return json;
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
function parseIncrementalResponse(text) {
    const json = extractJson(text);
    if (json) {
        return json;
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
function extractJson(text) {
    const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        }
        catch {
            // not valid JSON
        }
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function extractSection(text, tag) {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}
function extractList(text, tag) {
    const section = extractSection(text, tag);
    if (!section)
        return [];
    return section.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}
function extractModules(text) {
    const modules = [];
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
//# sourceMappingURL=analyze.js.map