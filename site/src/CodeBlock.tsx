import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
            className="relative py-2.5 px-3.5 font-mono text-[0.8rem] cursor-pointer"
          >
            {i === activeTab && (
              <motion.div
                layoutId="codeblock-tab-indicator"
                className="absolute inset-0 bg-bg"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className={`relative z-[1] transition-colors ${
              i === activeTab ? 'text-accent font-semibold' : 'text-muted font-normal'
            }`}>
              {tab.label}
            </span>
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
        className="relative w-10 h-10 flex items-center justify-center border-l border-border cursor-pointer shrink-0"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="text-success flex items-center justify-center"
            >
              <Check size={14} />
            </motion.span>
          ) : (
            <motion.span
              key="clipboard"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="text-muted flex items-center justify-center"
            >
              <Clipboard size={14} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
