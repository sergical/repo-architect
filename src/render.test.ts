import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { replaceSection, renderFullDocs, renderIncrementalDocs } from './render.js';
import type { AnalysisResult, IncrementalAnalysisResult } from './analyze.js';

// --- replaceSection ---

describe('replaceSection', () => {
  const doc = [
    '# Project',
    '',
    '## Overview',
    '',
    'Old overview content.',
    '',
    '## System Map',
    '',
    '```mermaid',
    'graph TD',
    '  A-->B',
    '```',
    '',
    '## Modules',
    '',
    '| Module | Path |',
    '|--------|------|',
  ].join('\n');

  it('replaces section with exact match', () => {
    const result = replaceSection(doc, 'Overview', 'New overview content.');
    expect(result).toContain('New overview content.');
    expect(result).not.toContain('Old overview content.');
    // Other sections preserved
    expect(result).toContain('## System Map');
    expect(result).toContain('## Modules');
  });

  it('matches section case-insensitively', () => {
    const result = replaceSection(doc, 'overview', 'Case-insensitive match.');
    expect(result).toContain('Case-insensitive match.');
    expect(result).toContain('## Overview'); // preserves original casing
  });

  it('appends section when not found', () => {
    const result = replaceSection(doc, 'Data Flows', 'New data flows content.');
    expect(result).toContain('## Data Flows');
    expect(result).toContain('New data flows content.');
    // Original content preserved
    expect(result).toContain('## Overview');
    expect(result).toContain('Old overview content.');
  });

  it('handles empty document', () => {
    const result = replaceSection('', 'Overview', 'Content for empty doc.');
    expect(result).toContain('## Overview');
    expect(result).toContain('Content for empty doc.');
  });

  it('handles document with only whitespace', () => {
    const result = replaceSection('   \n  ', 'Overview', 'Content.');
    expect(result).toContain('## Overview');
    expect(result).toContain('Content.');
  });

  it('preserves header-level content before first section', () => {
    const docWithHeader = '# My Project\n\n> Auto-generated\n\n## Overview\n\nOld.\n';
    const result = replaceSection(docWithHeader, 'Overview', 'New.');
    expect(result).toContain('# My Project');
    expect(result).toContain('> Auto-generated');
    expect(result).toContain('New.');
  });
});

// --- renderFullDocs ---

describe('renderFullDocs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(fs =>
      fs.mkdtemp(path.join(os.tmpdir(), 'render-test-'))
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates OVERVIEW.md and module files', async () => {
    const analysis: AnalysisResult = {
      projectName: 'Test Project',
      overview: 'A test project.',
      techStack: ['TypeScript'],
      systemMap: 'graph TD\n  A-->B',
      dataFlows: '',
      dependencyGraph: '',
      modules: [
        {
          name: 'CLI',
          path: 'src/cli',
          description: 'Command line interface',
          keyAbstractions: ['Parser'],
          internalDiagram: '',
        },
      ],
    };

    const files = await renderFullDocs(tmpDir, analysis);
    expect(files).toHaveLength(2);

    const overview = await readFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), 'utf-8');
    expect(overview).toContain('# Test Project');
    expect(overview).toContain('A test project.');
    expect(overview).toContain('graph TD');

    const mod = await readFile(path.join(tmpDir, 'docs/architecture/modules/cli.md'), 'utf-8');
    expect(mod).toContain('# CLI');
    expect(mod).toContain('Parser');
  });
});

// --- renderIncrementalDocs ---

describe('renderIncrementalDocs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await import('node:fs/promises').then(fs =>
      fs.mkdtemp(path.join(os.tmpdir(), 'render-incr-test-'))
    );
    // Set up existing docs
    const archDir = path.join(tmpDir, 'docs/architecture');
    const modulesDir = path.join(archDir, 'modules');
    await mkdir(modulesDir, { recursive: true });
    await writeFile(path.join(archDir, 'OVERVIEW.md'), '# Project\n\n## Overview\n\nOld overview.\n\n## System Map\n\nOld map.\n');
    await writeFile(path.join(modulesDir, 'old-module.md'), '# Old Module\n\nOld content.');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('updates overview sections', async () => {
    const analysis: IncrementalAnalysisResult = {
      updatedOverview: 'New overview content.',
      updatedSystemMap: null,
      updatedDataFlows: null,
      updatedDependencyGraph: null,
      updatedModules: [],
      newModules: [],
      deletedModules: [],
    };

    const { writtenFiles } = await renderIncrementalDocs(tmpDir, analysis);
    expect(writtenFiles).toHaveLength(1);

    const overview = await readFile(path.join(tmpDir, 'docs/architecture/OVERVIEW.md'), 'utf-8');
    expect(overview).toContain('New overview content.');
  });

  it('deletes orphaned module files', async () => {
    const analysis: IncrementalAnalysisResult = {
      updatedOverview: null,
      updatedSystemMap: null,
      updatedDataFlows: null,
      updatedDependencyGraph: null,
      updatedModules: [],
      newModules: [],
      deletedModules: ['Old Module'],
    };

    const { writtenFiles, deletedFiles } = await renderIncrementalDocs(tmpDir, analysis);
    expect(writtenFiles).toHaveLength(0);
    expect(deletedFiles).toHaveLength(1);
    expect(deletedFiles[0]).toContain('old-module.md');

    // Verify file is actually gone
    await expect(readFile(path.join(tmpDir, 'docs/architecture/modules/old-module.md'), 'utf-8'))
      .rejects.toThrow();
  });

  it('handles deleting non-existent module gracefully', async () => {
    const analysis: IncrementalAnalysisResult = {
      updatedOverview: null,
      updatedSystemMap: null,
      updatedDataFlows: null,
      updatedDependencyGraph: null,
      updatedModules: [],
      newModules: [],
      deletedModules: ['Non Existent Module'],
    };

    const { deletedFiles } = await renderIncrementalDocs(tmpDir, analysis);
    expect(deletedFiles).toHaveLength(0);
  });

  it('creates new module files', async () => {
    const analysis: IncrementalAnalysisResult = {
      updatedOverview: null,
      updatedSystemMap: null,
      updatedDataFlows: null,
      updatedDependencyGraph: null,
      updatedModules: [],
      newModules: [{
        name: 'New Module',
        path: 'src/new',
        description: 'A new module.',
        keyAbstractions: [],
        internalDiagram: '',
      }],
      deletedModules: [],
    };

    const { writtenFiles } = await renderIncrementalDocs(tmpDir, analysis);
    expect(writtenFiles).toHaveLength(1);
    const content = await readFile(path.join(tmpDir, 'docs/architecture/modules/new-module.md'), 'utf-8');
    expect(content).toContain('# New Module');
  });
});
