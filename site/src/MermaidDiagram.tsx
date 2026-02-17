import { useEffect, useRef, useState } from 'react';
import { useDiagramZoom } from './useDiagramZoom';
import { useTheme } from './useTheme';

function fixMermaidSyntax(src: string): string {
  let fixed = src;
  fixed = fixed.replace(/\|([^"|][^|]*[/\\@#&;][^|]*)\|/g, '|"$1"|');
  fixed = fixed.replace(/[ \t]+$/gm, '');
  return fixed;
}

function setSvg(el: HTMLElement, svgString: string) {
  while (el.firstChild) el.removeChild(el.firstChild);
  const fixed = svgString.replace(/<br\s*(?!\/)>/gi, '<br/>');
  const parser = new DOMParser();
  const doc = parser.parseFromString(fixed, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg && svg.nodeName === 'svg') {
    el.appendChild(document.importNode(svg, true));
  }
}

interface MermaidDiagramProps {
  source: string;
  id: string;
}

export function MermaidDiagram({ source, id }: MermaidDiagramProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { zoomIn, zoomOut, resetZoom } = useDiagramZoom(wrapRef, innerRef);
  const { theme: currentTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import('mermaid')).default;
      const isDark = currentTheme !== 'light';

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        suppressErrorRendering: true,
        themeVariables: isDark ? {
          darkMode: true,
          background: '#18181b',
          primaryColor: '#27272a',
          primaryTextColor: '#fafafa',
          primaryBorderColor: '#3f3f46',
          lineColor: '#71717a',
          secondaryColor: '#1f1f23',
          tertiaryColor: '#09090b',
        } : {
          darkMode: false,
          background: '#f4f4f5',
          primaryColor: '#e4e4e7',
          primaryTextColor: '#09090b',
          primaryBorderColor: '#d4d4d8',
          lineColor: '#71717a',
          secondaryColor: '#fafafa',
          tertiaryColor: '#ffffff',
        },
      });

      const uniqueId = `${id}-${Date.now()}`;
      try {
        const result = await mermaid.render(uniqueId, source);
        if (cancelled) return;
        const inner = innerRef.current;
        if (!inner) return;
        setSvg(inner, result.svg);
        setError(null);
      } catch {
        const fixed = fixMermaidSyntax(source);
        if (fixed !== source) {
          try {
            const result = await mermaid.render(uniqueId + '-fix', fixed);
            if (cancelled) return;
            const inner = innerRef.current;
            if (!inner) return;
            setSvg(inner, result.svg);
            setError(null);
            return;
          } catch {
            // fall through
          }
        }
        if (!cancelled) setError('Diagram render error');
      }
    }

    render();
    return () => { cancelled = true; };
  }, [source, id, currentTheme]);

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 text-muted text-[0.85rem]">
        {error}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="bg-surface border border-border rounded-xl overflow-hidden relative cursor-grab">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex gap-1 z-[2]">
        {[
          { label: '+', title: 'Zoom in', fn: zoomIn },
          { label: '\u2212', title: 'Zoom out', fn: zoomOut },
          { label: '\u21ba', title: 'Reset', fn: resetZoom },
        ].map((btn) => (
          <button
            key={btn.title}
            onClick={(e) => { e.stopPropagation(); btn.fn(); }}
            title={btn.title}
            className="bg-bg border border-border rounded text-muted w-7 h-7 cursor-pointer text-sm flex items-center justify-center"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div ref={innerRef} className="origin-top-left p-5 min-w-min" />
    </div>
  );
}
