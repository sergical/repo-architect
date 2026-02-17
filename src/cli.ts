#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanRepo, scanFiles } from './scan.js';
import { analyzeFullRepo, analyzeIncremental } from './analyze.js';
import { renderFullDocs, renderIncrementalDocs } from './render.js';
import { readState, writeState } from './state.js';
import { getChangedFiles, getCurrentSha, getGitLogSummary } from './diff.js';
import { createArchPr } from './pr.js';
import { setupGitHubAction } from './setup.js';
import { startViewer } from './view.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  return pkg.version;
}

async function runFull(repoRoot: string, createPr: boolean): Promise<void> {
  console.log(chalk.bold('\n  repo-architect') + chalk.dim(' - documenting your codebase\n'));

  const spinner = ora({ indent: 2 });

  // Step 1: Scan
  spinner.start('Scanning repository with Repomix...');
  const scanResult = await scanRepo(repoRoot);
  spinner.succeed(`Scanned ${scanResult.fileCount} files`);

  // Step 2: Analyze
  spinner.start('Analyzing architecture with Claude...');
  const analysis = await analyzeFullRepo(scanResult.content);
  spinner.succeed(`Identified ${analysis.modules.length} modules`);

  // Step 3: Render
  spinner.start('Generating documentation...');
  const writtenFiles = await renderFullDocs(repoRoot, analysis);
  spinner.succeed(`Wrote ${writtenFiles.length} files`);

  // Step 4: Save state
  const sha = await getCurrentSha(repoRoot).catch(() => 'unknown');
  await writeState(repoRoot, {
    lastCommitSha: sha,
    lastRunAt: new Date().toISOString(),
    modules: analysis.modules.map(m => ({ name: m.name, path: m.path, description: m.description })),
    repoRoot,
  });

  // Step 5: Show preview
  console.log(chalk.dim('\n  Generated files:'));
  for (const f of writtenFiles) {
    const rel = path.relative(repoRoot, f);
    console.log(chalk.green(`    + ${rel}`));
  }

  // Step 6: PR
  if (createPr) {
    spinner.start('Creating pull request...');
    try {
      const result = await createArchPr(
        repoRoot,
        writtenFiles.map(f => path.relative(repoRoot, f)),
        `Full architecture scan: ${analysis.modules.length} modules documented`,
      );
      if (result.prUrl) {
        spinner.succeed(`PR created: ${result.prUrl}`);
      } else {
        spinner.succeed(`Committed to branch ${result.branch} (push manually to create PR)`);
      }
    } catch (err) {
      spinner.warn(`Skipped PR: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  console.log(chalk.bold.green('\n  Done!') + chalk.dim(` Docs at ${path.relative(repoRoot, path.join(repoRoot, 'docs/architecture'))}/\n`));
}

async function runIncremental(repoRoot: string, createPr: boolean): Promise<void> {
  console.log(chalk.bold('\n  repo-architect') + chalk.dim(' - incremental update\n'));

  const spinner = ora({ indent: 2 });

  // Check for existing state
  const state = await readState(repoRoot);
  if (!state) {
    console.log(chalk.yellow('  No previous run found. Running full scan instead.\n'));
    return runFull(repoRoot, createPr);
  }

  // Step 1: Check diff
  spinner.start('Checking for changes...');
  const diff = await getChangedFiles(repoRoot, state.lastCommitSha);

  const structuralChanges = diff.changes.filter(c => c.isStructural);
  if (structuralChanges.length === 0) {
    spinner.succeed('No structural changes since last run');
    console.log(chalk.dim('\n  Nothing to update.\n'));
    return;
  }
  spinner.succeed(`Found ${structuralChanges.length} structural changes`);

  // Step 2: Scan changed files
  spinner.start('Scanning changed files...');
  const changedPaths = structuralChanges.map(c => c.file);
  const scanResult = await scanFiles(repoRoot, changedPaths);
  spinner.succeed(`Scanned ${scanResult.fileCount} changed files`);

  // Step 3: Load existing docs
  const overviewPath = path.join(repoRoot, 'docs/architecture/OVERVIEW.md');
  let existingDocs = '';
  try {
    existingDocs = await readFile(overviewPath, 'utf-8');
  } catch {
    // no existing docs
  }

  // Step 4: Get git log
  const gitLog = await getGitLogSummary(repoRoot, state.lastCommitSha);

  // Step 5: Analyze
  spinner.start('Analyzing changes with Claude...');
  const analysis = await analyzeIncremental(scanResult.content, existingDocs, diff.summary, gitLog);
  spinner.succeed('Analysis complete');

  // Step 6: Render
  spinner.start('Updating documentation...');
  const writtenFiles = await renderIncrementalDocs(repoRoot, analysis);
  spinner.succeed(`Updated ${writtenFiles.length} files`);

  // Step 7: Save state
  await writeState(repoRoot, {
    lastCommitSha: diff.currentSha,
    lastRunAt: new Date().toISOString(),
    modules: [
      ...state.modules.filter(m => !analysis.deletedModules.includes(m.name)),
      ...analysis.newModules.map(m => ({ name: m.name, path: m.path, description: m.description })),
    ],
    repoRoot,
  });

  // Show preview
  console.log(chalk.dim('\n  Updated files:'));
  for (const f of writtenFiles) {
    const rel = path.relative(repoRoot, f);
    console.log(chalk.green(`    ~ ${rel}`));
  }

  // PR
  if (createPr) {
    spinner.start('Creating pull request...');
    try {
      const result = await createArchPr(
        repoRoot,
        writtenFiles.map(f => path.relative(repoRoot, f)),
        `Incremental update: ${structuralChanges.length} structural changes`,
      );
      if (result.prUrl) {
        spinner.succeed(`PR created: ${result.prUrl}`);
      } else {
        spinner.succeed(`Committed to branch ${result.branch}`);
      }
    } catch (err) {
      spinner.warn(`Skipped PR: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  console.log(chalk.bold.green('\n  Done!\n'));
}

async function main(): Promise<void> {
  const version = await getVersion();

  const program = new Command()
    .name('repo-architect')
    .description('Your codebase, documented. Automatically.')
    .version(version);

  program
    .option('--full', 'Force full regeneration')
    .option('--incremental', 'Incremental update (default for subsequent runs)')
    .option('--pr', 'Create a pull request with changes')
    .option('--setup', 'Set up GitHub Action for nightly runs')
    .option('--view', 'Open local architecture viewer in browser')
    .option('-d, --dir <path>', 'Repository root directory', process.cwd())
    .action(async (opts) => {
      const repoRoot = path.resolve(opts.dir);

      if (opts.setup) {
        await setupGitHubAction(repoRoot);
        return;
      }

      if (opts.view) {
        await startViewer(repoRoot);
        return;
      }

      if (opts.incremental) {
        await runIncremental(repoRoot, opts.pr ?? false);
      } else {
        await runFull(repoRoot, opts.pr ?? false);
      }
    });

  await program.parseAsync();
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
