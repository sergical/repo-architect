import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'public', 'og.png');

async function fetchGoogleFont(weight: number): Promise<ArrayBuffer> {
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+' } },
  );
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error(`Could not find font URL for weight ${weight}`);
  const fontRes = await fetch(match[1]);
  return await fontRes.arrayBuffer();
}

async function fetchMonoFont(): Promise<ArrayBuffer> {
  // Geist Mono from Vercel's CDN (woff format for satori compatibility)
  const res = await fetch('https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/GeistMono-Regular.woff');
  if (res.ok) return await res.arrayBuffer();
  // Fallback to ttf
  const res2 = await fetch('https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/GeistMono-Regular.ttf');
  if (res2.ok) return await res2.arrayBuffer();
  throw new Error('Could not fetch Geist Mono font');
}

// Terminal lines matching the Hero component
const TERMINAL_LINES = [
  { text: '$ npx repo-architect', color: '#fafafa' },
  { text: '', color: 'transparent' },
  { text: '  repo-architect - documenting your codebase', color: '#71717a' },
  { text: '', color: 'transparent' },
  { text: '  \u2714 Scanned 142 files', color: '#4ade80' },
  { text: '  \u2714 Identified 8 modules', color: '#4ade80' },
  { text: '  \u2714 Wrote 9 files', color: '#4ade80' },
  { text: '', color: 'transparent' },
  { text: '  Generated files:', color: '#71717a' },
  { text: '    + docs/architecture/OVERVIEW.md', color: '#4ade80' },
  { text: '    + docs/architecture/modules/api.md', color: '#4ade80' },
  { text: '    + docs/architecture/modules/auth.md', color: '#4ade80' },
  { text: '    ...', color: '#71717a' },
  { text: '', color: 'transparent' },
  { text: '  Done! Docs at docs/architecture/', color: '#4ade80' },
];

function terminalLine(text: string, color: string) {
  return {
    type: 'div' as const,
    props: {
      style: {
        fontFamily: 'Geist Mono',
        fontSize: '13px',
        lineHeight: '1.8',
        color,
        whiteSpace: 'pre' as const,
        minHeight: '1.8em',
      },
      children: text || '\u00a0',
    },
  };
}

async function main() {
  const [fontData, boldFontData, monoFontData] = await Promise.all([
    fetchGoogleFont(400),
    fetchGoogleFont(700),
    fetchMonoFont(),
  ]);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#09090b',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // Subtle grid overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              },
            },
          },
          // Left side: text content
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px 0 60px 70px',
                width: '580px',
                flexShrink: 0,
              },
              children: [
                // Logo
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '36px',
                    },
                    children: [
                      // Favicon-style icon: blue rounded square with brackets
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '32px',
                            height: '32px',
                            borderRadius: '7px',
                            backgroundColor: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#fff',
                            letterSpacing: '-0.05em',
                          },
                          children: '{ }',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            fontSize: '18px',
                            color: '#a1a1aa',
                            letterSpacing: '-0.02em',
                          },
                          children: 'repo-architect',
                        },
                      },
                    ],
                  },
                },
                // Title
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '56px',
                      fontWeight: 700,
                      color: '#fafafa',
                      letterSpacing: '-0.04em',
                      lineHeight: 1.1,
                      marginBottom: '8px',
                    },
                    children: 'Your codebase,',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '56px',
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                      lineHeight: 1.1,
                      display: 'flex',
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: { color: '#fafafa' },
                          children: 'documented.',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '56px',
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                      lineHeight: 1.1,
                      color: '#3b82f6',
                      marginTop: '4px',
                    },
                    children: 'Automatically.',
                  },
                },
                // Tagline
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '20px',
                      color: '#71717a',
                      marginTop: '24px',
                      lineHeight: 1.5,
                    },
                    children: 'Automated architecture diagrams & docs from your codebase',
                  },
                },
              ],
            },
          },
          // Right side: CLI terminal (partially off-canvas)
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '50px',
                right: '-60px',
                width: '560px',
                bottom: '50px',
                display: 'flex',
                flexDirection: 'column',
              },
              children: [
                // Terminal window
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      height: '100%',
                    },
                    children: [
                      // Terminal header with traffic lights
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '14px 18px',
                            borderBottom: '1px solid #27272a',
                            backgroundColor: '#111113',
                          },
                          children: [
                            { type: 'div' as const, props: { style: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f57' } } },
                            { type: 'div' as const, props: { style: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#febc2e' } } },
                            { type: 'div' as const, props: { style: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#28c840' } } },
                          ],
                        },
                      },
                      // Terminal body
                      {
                        type: 'div',
                        props: {
                          style: {
                            padding: '20px 22px',
                            display: 'flex',
                            flexDirection: 'column',
                          },
                          children: TERMINAL_LINES.map(l => terminalLine(l.text, l.color)),
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Fade overlay on right edge for the off-canvas effect
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                right: 0,
                width: '30px',
                height: '100%',
                background: 'linear-gradient(to right, transparent, #09090b)',
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontData, weight: 400, style: 'normal' as const },
        { name: 'Inter', data: boldFontData, weight: 700, style: 'normal' as const },
        { name: 'Geist Mono', data: monoFontData, weight: 400, style: 'normal' as const },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width' as const, value: 1200 },
  });
  const png = resvg.render().asPng();
  writeFileSync(outPath, png);
  console.log(`✓ Generated ${outPath} (${png.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
