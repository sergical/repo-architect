import { FileText, Code, Clock, Monitor } from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'Mermaid Diagrams',
    description: 'System maps, data flows, dependency graphs, class diagrams. Renders natively on GitHub.',
  },
  {
    icon: Code,
    title: 'Incremental Updates',
    description: 'Only regenerates docs when structural changes are detected. Preserves your hand-written notes.',
  },
  {
    icon: Clock,
    title: 'Nightly PR',
    description: 'GitHub Action runs every night, opens a PR with updated docs. Zero maintenance.',
  },
  {
    icon: Monitor,
    title: 'Local Viewer',
    description: 'Interactive HTML viewer with zoom/pan diagrams, dark theme, and sidebar navigation.',
  },
];

export function Features() {
  return (
    <section className="py-20 max-md:py-15 border-t border-border text-center">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="section-label">Features</div>
        <h2 className="section-title text-center mb-12">
          Everything you need to keep docs in sync
        </h2>

        <div className="grid grid-cols-2 gap-5 text-left max-[540px]:grid-cols-1">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-surface border border-border rounded-xl py-7 px-6">
                <div className="w-10 h-10 rounded-[10px] bg-bg border border-border flex items-center justify-center mb-4">
                  <Icon size={18} className="text-accent" />
                </div>
                <h3 className="text-[0.95rem] font-semibold text-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-[0.85rem] text-muted leading-normal">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
