import { useState, useRef } from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { galleryOverview, galleryModule, galleryFlows } from './diagrams';

const TABS = [
  { label: 'System Map', key: 'overview', source: galleryOverview },
  { label: 'Module Detail', key: 'module', source: galleryModule },
  { label: 'Data Flows', key: 'flows', source: galleryFlows },
];

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
            <button
              key={tab.key}
              ref={(el) => { tabsRef.current[i] = el; }}
              role="tab"
              aria-selected={i === activeTab}
              tabIndex={i === activeTab ? 0 : -1}
              onClick={() => setActiveTab(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`py-2 px-5 rounded-full cursor-pointer text-[0.9rem] font-sans transition-colors ${
                i === activeTab
                  ? 'bg-bg border border-accent text-accent'
                  : 'text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="max-w-[900px] mx-auto">
          {TABS.map((tab, i) => (
            <div key={tab.key} role="tabpanel" hidden={i !== activeTab}>
              {i === activeTab && (
                <MermaidDiagram source={tab.source} id={`gallery-${tab.key}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
