import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MermaidDiagram } from './MermaidDiagram';
import { galleryOverview, galleryModule, galleryFlows } from './diagrams';

const TABS = [
  { label: 'System Map', key: 'overview', source: galleryOverview },
  { label: 'Module Detail', key: 'module', source: galleryModule },
  { label: 'Data Flows', key: 'flows', source: galleryFlows },
];

const springTransition = { type: 'spring' as const, stiffness: 500, damping: 30 };

export function Gallery() {
  const [activeTab, setActiveTab] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight'
        ? (i + 1) % TABS.length
        : (i - 1 + TABS.length) % TABS.length;
      setActiveTab(next);
      tabsRef.current[next]?.focus();
    }
  };

  return (
    <section className="py-20 max-md:py-15 border-t border-border">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="section-label">Real output</div>
        <h2 className="section-title text-center mb-10">
          Generated from repo-architect's own codebase
        </h2>

        {/* Tabs */}
        <div
          role="tablist"
          className="flex justify-center gap-1 mb-6 bg-surface rounded-full p-1 w-fit mx-auto"
        >
          {TABS.map((tab, i) => (
            <motion.button
              key={tab.key}
              ref={(el) => { tabsRef.current[i] = el; }}
              role="tab"
              aria-selected={i === activeTab}
              tabIndex={i === activeTab ? 0 : -1}
              onClick={() => setActiveTab(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              whileTap={{ scale: 0.97 }}
              className="relative py-2 px-5 rounded-full cursor-pointer text-[0.9rem] font-sans transition-colors hover:bg-surface/50"
              style={{ color: i === activeTab ? undefined : 'var(--color-muted)' }}
            >
              {i === activeTab && (
                <motion.div
                  layoutId="gallery-tab-indicator"
                  className="absolute inset-0 rounded-full bg-bg border border-accent"
                  transition={springTransition}
                />
              )}
              <span className="relative z-[1]" style={i === activeTab ? { color: 'var(--color-accent)' } : undefined}>
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Panels */}
        <div className="max-w-[900px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={TABS[activeTab].key}
              role="tabpanel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <MermaidDiagram source={TABS[activeTab].source} id={`gallery-${TABS[activeTab].key}`} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
