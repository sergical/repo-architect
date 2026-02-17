import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';

const TERMINAL_LINES = [
  { text: '$ npx repo-architect', type: 'cmd' as const, delay: 0 },
  { text: '', type: 'blank' as const, delay: 600 },
  { text: '  repo-architect - documenting your codebase', type: 'muted' as const, delay: 800 },
  { text: '', type: 'blank' as const, delay: 1000 },
  { text: '  \u2714 Scanned 142 files', type: 'success' as const, delay: 1400 },
  { text: '  \u2714 Identified 8 modules', type: 'success' as const, delay: 1900 },
  { text: '  \u2714 Wrote 9 files', type: 'success' as const, delay: 2400 },
  { text: '', type: 'blank' as const, delay: 2600 },
  { text: '  Generated files:', type: 'muted' as const, delay: 2800 },
  { text: '    + docs/architecture/OVERVIEW.md', type: 'success' as const, delay: 3000 },
  { text: '    + docs/architecture/modules/api.md', type: 'success' as const, delay: 3200 },
  { text: '    + docs/architecture/modules/auth.md', type: 'success' as const, delay: 3400 },
  { text: '    ...', type: 'muted' as const, delay: 3600 },
  { text: '', type: 'blank' as const, delay: 3800 },
  { text: '  Done! Docs at docs/architecture/', type: 'success' as const, delay: 4000 },
  { text: '', type: 'blank' as const, delay: 4200 },
  { text: '$ npx repo-architect --view', type: 'cmd' as const, delay: 4400 },
  { text: '  Viewer running at http://127.0.0.1:3333', type: 'muted' as const, delay: 4800 },
];

const LINE_CLASSES: Record<string, string> = {
  cmd: 'text-text',
  muted: 'text-muted',
  success: 'text-success',
  blank: 'text-transparent',
};

export function Hero() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    TERMINAL_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="pt-[100px] pb-[60px]">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="grid grid-cols-[1fr_1.2fr] gap-12 items-center max-md:grid-cols-1">
          {/* Left: headline */}
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight text-text mb-3">
              <span className="text-accent">repo</span>-architect
            </h1>
            <p className="text-xl text-muted mb-10 max-w-[460px]">
              Your codebase, documented. Automatically. Every night.
            </p>
            <CodeBlock />
          </div>

          {/* Right: animated terminal */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden font-mono text-[0.85rem] leading-[1.8]">
            {/* Terminal header */}
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border bg-bg">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>

            {/* Terminal body — all lines rendered for stable height, hidden until revealed */}
            <div className="py-5 px-6">
              {TERMINAL_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`min-h-[1.8em] ${LINE_CLASSES[line.type]} ${i < visibleLines ? 'visible' : 'invisible'}`}
                >
                  {line.text || '\u00a0'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
