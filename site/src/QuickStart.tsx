import { CodeBlock } from './CodeBlock';

const TERMINAL_OUTPUT = [
  { text: '$ npx repo-architect', type: 'cmd' },
  { text: '', type: 'blank' },
  { text: '  repo-architect - documenting your codebase', type: 'muted' },
  { text: '', type: 'blank' },
  { text: '  \u2714 Scanned 142 files', type: 'success' },
  { text: '  \u2714 Identified 8 modules', type: 'success' },
  { text: '  \u2714 Wrote 9 files', type: 'success' },
  { text: '', type: 'blank' },
  { text: '  Generated files:', type: 'muted' },
  { text: '    + docs/architecture/OVERVIEW.md', type: 'success' },
  { text: '    + docs/architecture/modules/api.md', type: 'success' },
  { text: '    + docs/architecture/modules/auth.md', type: 'success' },
  { text: '    ...', type: 'muted' },
  { text: '', type: 'blank' },
  { text: '  Done! Docs at docs/architecture/', type: 'success' },
  { text: '', type: 'blank' },
  { text: '$ npx repo-architect --view', type: 'cmd' },
  { text: '  Viewer running at http://127.0.0.1:3333', type: 'muted' },
] as const;

const LINE_CLASSES: Record<string, string> = {
  cmd: 'text-text',
  muted: 'text-muted',
  success: 'text-success',
  blank: 'text-transparent',
};

export function QuickStart() {
  return (
    <section className="py-20 max-md:py-15 border-t border-border text-center">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="section-label">Get started</div>
        <h2 className="section-title text-center mb-10">
          Up and running in 30 seconds
        </h2>

        {/* Terminal */}
        <div className="bg-surface border border-border rounded-xl text-left max-w-[640px] mx-auto font-mono text-[0.85rem] leading-[1.8] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border bg-bg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>

          {/* Body */}
          <div className="py-5 px-6">
            {TERMINAL_OUTPUT.map((line, i) => (
              <div key={i} className={`min-h-[1.8em] ${LINE_CLASSES[line.type]}`}>
                {line.text}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <CodeBlock />
        </div>
      </div>
    </section>
  );
}
