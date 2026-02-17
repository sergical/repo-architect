import { Terminal } from 'lucide-react';

const COMMANDS = [
  {
    command: 'npx repo-architect',
    description: 'Generate docs (auto-detects full vs incremental)',
  },
  {
    command: 'npx repo-architect --pr',
    description: 'Generate + open a pull request',
  },
  {
    command: 'npx repo-architect --view',
    description: 'Open local interactive viewer',
  },
  {
    command: 'npx repo-architect --setup',
    description: 'Set up nightly GitHub Action',
  },
  {
    command: 'npx repo-architect --full',
    description: 'Force full regeneration',
  },
  {
    command: 'npx repo-architect --incremental',
    description: 'Force incremental update',
  },
];

export function Usage() {
  return (
    <section className="py-20 max-md:py-15 border-t border-border">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="section-label">Usage</div>
        <h2 className="section-title text-center mb-12">
          CLI flags for every workflow
        </h2>

        <div className="grid grid-cols-2 gap-4 max-w-[800px] mx-auto max-[600px]:grid-cols-1">
          {COMMANDS.map((cmd) => (
            <div key={cmd.command} className="bg-surface border border-border rounded-[10px] p-5 flex gap-3.5 items-start">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center">
                <Terminal size={14} className="text-accent" />
              </div>
              <div>
                <code className="font-mono text-[0.8rem] text-text font-semibold">
                  {cmd.command}
                </code>
                <p className="text-[0.8rem] text-muted mt-1 leading-[1.4]">
                  {cmd.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
