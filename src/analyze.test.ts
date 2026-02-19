import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseAnalysisResponse, parseIncrementalResponse, validateMermaid } from './analyze.js';

// --- validateMermaid ---

describe('validateMermaid', () => {
  it('passes valid graph diagram through', () => {
    expect(validateMermaid('graph TD\n  A-->B')).toBe('graph TD\n  A-->B');
  });

  it('passes valid flowchart through', () => {
    expect(validateMermaid('flowchart LR\n  A-->B')).toBe('flowchart LR\n  A-->B');
  });

  it('passes valid sequenceDiagram through', () => {
    const src = 'sequenceDiagram\n  Alice->>Bob: Hello';
    expect(validateMermaid(src)).toBe(src);
  });

  it('returns empty string for empty input', () => {
    expect(validateMermaid('')).toBe('');
    expect(validateMermaid('   ')).toBe('');
  });

  it('prepends graph TD when arrows present but no declaration', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = validateMermaid('A-->B\n  B-->C');
    expect(result).toBe('graph TD\nA-->B\n  B-->C');
    spy.mockRestore();
  });

  it('returns empty string for completely invalid content', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = validateMermaid('just some random text');
    expect(result).toBe('');
    spy.mockRestore();
  });

  it('trims whitespace', () => {
    expect(validateMermaid('  graph TD\n  A-->B  ')).toBe('graph TD\n  A-->B');
  });
});

// --- parseAnalysisResponse ---

describe('parseAnalysisResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      projectName: 'test-project',
      overview: 'A test project',
      techStack: ['TypeScript', 'Node.js'],
      systemMap: 'graph TD\n  A-->B',
      dataFlows: '',
      dependencyGraph: '',
      modules: [],
    });

    const result = parseAnalysisResponse(json);
    expect(result.projectName).toBe('test-project');
    expect(result.overview).toBe('A test project');
    expect(result.techStack).toEqual(['TypeScript', 'Node.js']);
    expect(result.modules).toEqual([]);
  });

  it('parses JSON inside code fences', () => {
    const text = '```json\n' + JSON.stringify({
      projectName: 'fenced',
      overview: 'From fences',
      techStack: [],
      systemMap: '',
      dataFlows: '',
      dependencyGraph: '',
      modules: [],
    }) + '\n```';

    const result = parseAnalysisResponse(text);
    expect(result.projectName).toBe('fenced');
  });

  it('falls back to XML tag extraction', () => {
    const text = `
<PROJECT_NAME>xml-project</PROJECT_NAME>
<OVERVIEW>An overview via XML</OVERVIEW>
<TECH_STACK>
- TypeScript
- React
</TECH_STACK>
<SYSTEM_MAP>graph TD
  A-->B</SYSTEM_MAP>
`;

    const result = parseAnalysisResponse(text);
    expect(result.projectName).toBe('xml-project');
    expect(result.overview).toBe('An overview via XML');
    expect(result.techStack).toEqual(['TypeScript', 'React']);
    expect(result.systemMap).toBe('graph TD\n  A-->B');
  });

  it('extracts modules from MODULE tags', () => {
    const text = `
<MODULE>
<NAME>CLI</NAME>
<PATH>src/cli</PATH>
<DESCRIPTION>Command line interface</DESCRIPTION>
<KEY_ABSTRACTIONS>
- Command parser
- Option handler
</KEY_ABSTRACTIONS>
<INTERNAL_DIAGRAM>graph TD
  Parse-->Execute</INTERNAL_DIAGRAM>
</MODULE>
<MODULE>
<NAME>API</NAME>
<PATH>src/api</PATH>
<DESCRIPTION>REST API layer</DESCRIPTION>
<KEY_ABSTRACTIONS>
- Router
</KEY_ABSTRACTIONS>
<INTERNAL_DIAGRAM></INTERNAL_DIAGRAM>
</MODULE>
`;

    const result = parseAnalysisResponse(text);
    expect(result.modules).toHaveLength(2);
    expect(result.modules[0].name).toBe('CLI');
    expect(result.modules[0].path).toBe('src/cli');
    expect(result.modules[0].keyAbstractions).toEqual(['Command parser', 'Option handler']);
    expect(result.modules[0].internalDiagram).toBe('graph TD\n  Parse-->Execute');
    expect(result.modules[1].name).toBe('API');
  });

  it('handles malformed JSON gracefully', () => {
    const text = 'This is not JSON and has no XML tags either.';
    const result = parseAnalysisResponse(text);
    expect(result.projectName).toBe('Unknown Project');
    expect(result.overview).toBe(text);
  });

  it('validates mermaid diagrams in JSON response', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const json = JSON.stringify({
      projectName: 'test',
      overview: 'test',
      techStack: [],
      systemMap: 'A-->B',
      dataFlows: 'invalid random text',
      dependencyGraph: 'graph TD\n  X-->Y',
      modules: [{
        name: 'mod',
        path: 'src/mod',
        description: 'a module',
        keyAbstractions: [],
        internalDiagram: 'C-->D',
      }],
    });

    const result = parseAnalysisResponse(json);
    expect(result.systemMap).toBe('graph TD\nA-->B');
    expect(result.dataFlows).toBe('');
    expect(result.dependencyGraph).toBe('graph TD\n  X-->Y');
    expect(result.modules[0].internalDiagram).toBe('graph TD\nC-->D');
    spy.mockRestore();
  });
});

// --- parseIncrementalResponse ---

describe('parseIncrementalResponse', () => {
  it('parses valid JSON incremental response', () => {
    const json = JSON.stringify({
      updatedOverview: 'New overview',
      updatedSystemMap: null,
      updatedDataFlows: null,
      updatedDependencyGraph: null,
      updatedModules: [],
      newModules: [{
        name: 'NewMod',
        path: 'src/new',
        description: 'A new module',
        keyAbstractions: ['Thing'],
        internalDiagram: '',
      }],
      deletedModules: ['OldMod'],
    });

    const result = parseIncrementalResponse(json);
    expect(result.updatedOverview).toBe('New overview');
    expect(result.newModules).toHaveLength(1);
    expect(result.newModules[0].name).toBe('NewMod');
    expect(result.deletedModules).toEqual(['OldMod']);
  });

  it('falls back to XML tag extraction', () => {
    const text = `
<UPDATED_OVERVIEW>Updated overview text</UPDATED_OVERVIEW>
<UPDATED_SYSTEM_MAP>graph TD
  X-->Y</UPDATED_SYSTEM_MAP>
`;

    const result = parseIncrementalResponse(text);
    expect(result.updatedOverview).toBe('Updated overview text');
    expect(result.updatedSystemMap).toBe('graph TD\n  X-->Y');
    expect(result.deletedModules).toEqual([]);
  });

  it('handles empty incremental response', () => {
    const text = 'No updates needed.';
    const result = parseIncrementalResponse(text);
    expect(result.updatedOverview).toBeNull();
    expect(result.updatedModules).toEqual([]);
    expect(result.newModules).toEqual([]);
    expect(result.deletedModules).toEqual([]);
  });
});

// --- .env file parsing (pattern used by getApiKey) ---

describe('.env file ANTHROPIC_API_KEY parsing', () => {
  const ENV_KEY_REGEX = /^(?:export\s+)?ANTHROPIC_API_KEY=(.+)$/m;

  function extractKey(envContent: string): string | null {
    const match = envContent.match(ENV_KEY_REGEX);
    if (match) {
      const value = match[1].trim().replace(/^["']|["']$/g, '');
      return value || null;
    }
    return null;
  }

  it('extracts bare key', () => {
    expect(extractKey('ANTHROPIC_API_KEY=sk-ant-12345')).toBe('sk-ant-12345');
  });

  it('extracts double-quoted key', () => {
    expect(extractKey('ANTHROPIC_API_KEY="sk-ant-12345"')).toBe('sk-ant-12345');
  });

  it('extracts single-quoted key', () => {
    expect(extractKey("ANTHROPIC_API_KEY='sk-ant-12345'")).toBe('sk-ant-12345');
  });

  it('handles export prefix', () => {
    expect(extractKey('export ANTHROPIC_API_KEY=sk-ant-12345')).toBe('sk-ant-12345');
  });

  it('handles export prefix with quotes', () => {
    expect(extractKey('export ANTHROPIC_API_KEY="sk-ant-12345"')).toBe('sk-ant-12345');
  });

  it('extracts key among other env vars', () => {
    const content = 'OTHER_VAR=hello\nANTHROPIC_API_KEY=sk-ant-12345\nANOTHER=world';
    expect(extractKey(content)).toBe('sk-ant-12345');
  });

  it('returns null when key is not present', () => {
    expect(extractKey('OTHER_VAR=hello\nSOMETHING=else')).toBeNull();
  });

  it('returns null for empty value', () => {
    expect(extractKey('ANTHROPIC_API_KEY=')).toBeNull();
  });
});
