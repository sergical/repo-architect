import { Search, Brain, FileText } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';
import { howItWorks } from './diagrams';

const STEPS = [
  {
    num: '1',
    icon: Search,
    title: 'Scan',
    description: 'Repomix extracts your entire codebase into a structured format \u2014 any language, any framework.',
  },
  {
    num: '2',
    icon: Brain,
    title: 'Analyze',
    description: 'Claude reads the full codebase and identifies modules, data flows, dependencies, and key abstractions.',
  },
  {
    num: '3',
    icon: FileText,
    title: 'Render',
    description: 'Generates Markdown docs with Mermaid diagrams \u2014 system maps, sequence diagrams, class diagrams, and more.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 max-md:py-15 border-t border-border">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="section-label">How it works</div>
        <h2 className="section-title text-center">
          One command. Full architecture docs.
        </h2>

        {/* Steps row */}
        <div className="grid grid-cols-3 gap-6 mb-12 max-md:grid-cols-1">
          {STEPS.map((step) => (
            <div key={step.num} className="flex gap-3.5 items-start">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-surface border border-border text-accent font-bold text-[0.85rem] flex items-center justify-center">
                {step.num}
              </div>
              <div>
                <h3 className="text-base font-semibold text-text mb-1">
                  {step.title}
                </h3>
                <p className="text-[0.85rem] text-muted leading-normal">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Full-width diagram */}
        <div className="min-h-[500px]">
          <MermaidDiagram source={howItWorks} id="how-it-works" />
        </div>
      </div>
    </section>
  );
}
