import { useState, useCallback } from 'react';
import { Clipboard, Check } from 'lucide-react';

const TABS = [
  { label: 'npx', command: 'npx repo-architect' },
  { label: 'bunx', command: 'bunx repo-architect' },
] as const;

export function CodeBlock() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const text = TABS[activeTab].command;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [activeTab]);

  return (
    <div className="inline-flex items-center bg-surface border border-border rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-r border-border">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`py-2.5 px-3.5 font-mono text-[0.8rem] cursor-pointer transition-colors ${
              i === activeTab ? 'bg-bg text-accent font-semibold' : 'bg-transparent text-muted font-normal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Command display */}
      <code className="py-2.5 px-4 font-mono text-[0.85rem] text-text whitespace-nowrap">
        <span className="text-muted">$ </span>
        {TABS[activeTab].command}
      </code>

      {/* Copy button */}
      <button
        onClick={copy}
        aria-label="Copy command"
        className={`w-10 h-10 flex items-center justify-center border-l border-border cursor-pointer transition-colors shrink-0 ${
          copied ? 'text-success' : 'text-muted'
        }`}
      >
        {copied ? <Check size={14} /> : <Clipboard size={14} />}
      </button>
    </div>
  );
}
