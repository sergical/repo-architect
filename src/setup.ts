import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

const WORKFLOW_TEMPLATE = `name: Architecture Docs

on:
  schedule:
    - cron: '__CRON__'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Update architecture docs
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: npx repo-architect --incremental

      - name: Create PR
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: npx repo-architect --incremental --pr
`;

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function setupGitHubAction(repoRoot: string): Promise<void> {
  console.log('\n  Setting up GitHub Action for nightly architecture updates\n');

  const cronAnswer = await ask('  Cron schedule (default: "0 3 * * *" = 3am daily): ');
  const cron = cronAnswer || '0 3 * * *';

  const workflowDir = path.join(repoRoot, '.github', 'workflows');
  await mkdir(workflowDir, { recursive: true });

  const workflow = WORKFLOW_TEMPLATE.replace('__CRON__', cron);
  const workflowPath = path.join(workflowDir, 'repo-architect.yml');
  await writeFile(workflowPath, workflow);

  console.log(`\n  Created ${workflowPath}`);
  console.log('\n  Next steps:');
  console.log('  1. Add ANTHROPIC_API_KEY to your repo secrets:');
  console.log('     gh secret set ANTHROPIC_API_KEY');
  console.log('  2. Commit and push the workflow file');
  console.log('  3. The action will run on your chosen schedule\n');
}
