export interface ViewerModule {
  name: string;
  slug: string;
  content: string;
}

export interface ViewerData {
  projectName: string;
  overview: string;
  modules: ViewerModule[];
  lastRunAt: string | null;
}

/**
 * Generates a self-contained HTML page for the local architecture viewer.
 * Data is injected as a JSON payload and rendered client-side with marked + mermaid.
 *
 * Security note: This page is served on localhost only, with data sourced
 * exclusively from the user's own local filesystem (docs/architecture/).
 * innerHTML is used intentionally to render trusted local markdown content
 * via the marked library - this is standard for local dev tools.
 */
export function getViewerHtml(data: ViewerData): string {
  const jsonPayload = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(data.projectName)} - Architecture</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.css">
<script>
(function() {
  var t = localStorage.getItem('viewer-theme') ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', t);
})();
</script>
<style>
  :root[data-theme="dark"] {
    --bg: #09090b;
    --surface: #18181b;
    --border: #27272a;
    --text: #fafafa;
    --muted: #a1a1aa;
    --accent: #3b82f6;
    --success: #22c55e;
    --hover-bg: #1f1f23;
    --active-bg: #172554;
  }
  :root[data-theme="light"] {
    --bg: #ffffff;
    --surface: #f4f4f5;
    --border: #e4e4e7;
    --text: #09090b;
    --muted: #71717a;
    --accent: #2563eb;
    --success: #16a34a;
    --hover-bg: #f4f4f5;
    --active-bg: #dbeafe;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body {
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg); color: var(--text);
    display: flex; min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 260px; min-width: 260px;
    background: var(--surface); border-right: 1px solid var(--border);
    padding: 24px 16px; display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto;
    z-index: 10;
  }
  .sidebar-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border);
  }
  .sidebar-brand {
    font-size: 14px; font-weight: 600; color: var(--muted);
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .sidebar-brand span { color: var(--accent); }
  .theme-toggle {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    padding: 4px 6px; cursor: pointer; color: var(--muted); font-size: 14px;
    line-height: 1; transition: color 0.15s, border-color 0.15s;
  }
  .theme-toggle:hover { color: var(--text); border-color: var(--muted); }
  .nav-item {
    display: block; padding: 8px 12px; margin-bottom: 2px;
    border-radius: 6px; cursor: pointer; font-size: 14px;
    color: var(--muted); text-decoration: none; transition: all 0.15s;
  }
  .nav-item:hover { background: var(--hover-bg); color: var(--text); }
  .nav-item.active { background: var(--active-bg); color: var(--accent); }
  .nav-item.overview { font-weight: 600; color: var(--text); margin-bottom: 12px; }
  .nav-item.overview.active { color: var(--accent); }
  .nav-section {
    font-size: 11px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 8px 12px 4px; margin-top: 8px; opacity: 0.6;
  }
  .sidebar-footer {
    margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border);
    font-size: 12px; color: var(--muted); opacity: 0.6;
  }

  /* Toggle button for mobile */
  .sidebar-toggle {
    display: none; position: fixed; top: 12px; left: 12px; z-index: 20;
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    color: var(--muted); padding: 8px 12px; cursor: pointer; font-size: 14px;
  }

  /* Main content */
  .main { margin-left: 260px; flex: 1; padding: 48px 64px; max-width: 900px; }

  /* Markdown styles */
  .main h1 { font-size: 2em; font-weight: 700; margin-bottom: 8px; color: var(--text); }
  .main h2 {
    font-size: 1.4em; font-weight: 600; margin-top: 40px; margin-bottom: 16px;
    color: var(--text); padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }
  .main h3 { font-size: 1.15em; font-weight: 600; margin-top: 28px; margin-bottom: 12px; color: var(--text); }
  .main p { line-height: 1.7; margin-bottom: 16px; color: var(--muted); }
  .main a { color: var(--accent); text-decoration: none; }
  .main a:hover { text-decoration: underline; }
  .main ul, .main ol { margin-bottom: 16px; padding-left: 24px; color: var(--muted); }
  .main li { margin-bottom: 6px; line-height: 1.6; }
  .main blockquote {
    border-left: 3px solid var(--border); padding: 8px 16px; margin-bottom: 16px;
    color: var(--muted); font-style: italic;
  }
  .main code {
    background: var(--surface); padding: 2px 6px; border-radius: 4px;
    font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace; font-size: 0.9em; color: var(--accent);
  }
  .main pre {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px; margin-bottom: 20px; overflow-x: auto;
  }
  .main pre code { background: none; padding: 0; color: var(--text); }
  .main table {
    width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em;
  }
  .main th {
    text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--border);
    color: var(--muted); font-weight: 600;
  }
  .main td { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--muted); }
  .main tr:hover td { background: var(--surface); }
  .main img { max-width: 100%; border-radius: 8px; }
  .main hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  /* Mermaid diagrams */
  .mermaid-wrap {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    margin-bottom: 20px; position: relative; overflow: hidden;
    cursor: grab; min-height: 80px;
  }
  .mermaid-wrap:active { cursor: grabbing; }
  .mermaid-inner {
    transform-origin: 0 0; padding: 20px; min-width: min-content;
  }
  .mermaid-inner svg { display: block; margin: 0 auto; max-width: none; }
  .mermaid-controls {
    position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 2;
  }
  .mermaid-controls button {
    background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
    color: var(--muted); width: 28px; height: 28px; cursor: pointer;
    font-size: 14px; display: flex; align-items: center; justify-content: center;
  }
  .mermaid-controls button:hover { color: var(--text); border-color: var(--muted); }
  .mermaid-error {
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px; margin-bottom: 20px;
  }
  .mermaid-error summary {
    color: #ef4444; cursor: pointer; font-size: 13px; margin-bottom: 8px;
  }
  .mermaid-error pre {
    margin: 0; border: none; background: transparent; font-size: 13px; color: var(--muted);
  }

  /* Empty state */
  .empty-state {
    text-align: center; padding: 80px 40px;
  }
  .empty-state h2 { border: none; color: var(--muted); }
  .empty-state p { color: var(--muted); opacity: 0.6; }
  .empty-state code { font-size: 1em; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); transition: transform 0.2s; }
    .sidebar.open { transform: translateX(0); }
    .sidebar-toggle { display: block; }
    .main { margin-left: 0; padding: 48px 24px; }
  }
</style>
</head>
<body>

<button class="sidebar-toggle" id="sidebar-toggle">&#9776; Menu</button>

<nav class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-brand"><span>repo</span>-architect</div>
    <button class="theme-toggle" id="theme-toggle" title="Toggle theme">&#9788;</button>
  </div>
  <div id="nav"></div>
  <div class="sidebar-footer" id="footer"></div>
</nav>

<main class="main" id="content"></main>

<script>window.__ARCH_DATA__ = ${jsonPayload};</script>
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
// Local-only viewer: all data comes from the user's own docs/architecture/ files.
// Safe innerHTML usage: renders trusted local markdown via marked.js and
// mermaid SVG output — both sourced exclusively from user's own filesystem.
(function() {
  var data = window.__ARCH_DATA__;

  // Theme toggle
  var themeBtn = document.getElementById('theme-toggle');
  function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
  function updateThemeIcon() { themeBtn.textContent = getTheme() === 'dark' ? '\\u2606' : '\\u263E'; }
  updateThemeIcon();
  themeBtn.addEventListener('click', function() {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('viewer-theme', next);
    updateThemeIcon();
    initMermaid();
    showContent(currentTarget);
  });

  var currentTarget = 'overview';

  function initMermaid() {
    var isDark = getTheme() === 'dark';
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
  }
  initMermaid();

  // Store raw mermaid sources separately, render via API
  var mermaidSources = [];

  function renderMarkdown(md) {
    mermaidSources = [];

    var processed = md.replace(/\\\`\\\`\\\`mermaid\\n([\\s\\S]*?)\\\`\\\`\\\`/g, function(_, code) {
      var idx = mermaidSources.length;
      mermaidSources.push(code.trim());
      return '<!--MERMAID:' + idx + '-->';
    });

    var html = marked.parse(processed);

    mermaidSources.forEach(function(_, i) {
      html = html.replace(
        '<!--MERMAID:' + i + '-->',
        '<div class="mermaid-wrap" data-idx="' + i + '"><div class="mermaid-inner"></div></div>'
      );
    });

    return html;
  }

  // Auto-fix common mermaid syntax issues and retry
  function fixMermaidSyntax(src) {
    var fixed = src;
    fixed = fixed.replace(/\\|([^"|][^|]*[/\\\\@#&;][^|]*)\\|/g, '|"$1"|');
    fixed = fixed.replace(/[ \\t]+$/gm, '');
    return fixed;
  }

  async function tryRenderMermaid(id, src) {
    try {
      return await mermaid.render(id, src);
    } catch (e) {
      var fixed = fixMermaidSyntax(src);
      if (fixed !== src) {
        return await mermaid.render(id + '-fix', fixed);
      }
      throw e;
    }
  }

  // Render mermaid diagrams via API
  async function renderMermaidDiagrams() {
    var wraps = content.querySelectorAll('.mermaid-wrap');
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var idx = parseInt(wrap.dataset.idx, 10);
      var src = mermaidSources[idx];
      var inner = wrap.querySelector('.mermaid-inner');
      try {
        var result = await tryRenderMermaid('mermaid-' + Date.now() + '-' + idx, src);
        // Safe: SVG output from mermaid.render(), sourced from local markdown files
        setSvgContent(inner, result.svg);
        addZoomPan(wrap, inner);
      } catch (err) {
        wrap.classList.add('mermaid-error');
        wrap.style.overflow = 'visible';
        var details = document.createElement('details');
        details.open = true;
        var summary = document.createElement('summary');
        summary.textContent = 'Diagram syntax error (raw source shown)';
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        code.textContent = src;
        pre.appendChild(code);
        details.appendChild(summary);
        details.appendChild(pre);
        inner.textContent = '';
        inner.appendChild(details);
      }
    }
  }

  // Parse and insert SVG safely via DOMParser
  function setSvgContent(el, svgString) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var fixed = svgString.replace(/<br\\s*(?!\\/)>/gi, '<br/>');
    var parser = new DOMParser();
    var doc = parser.parseFromString(fixed, 'image/svg+xml');
    var svg = doc.documentElement;
    if (svg && svg.nodeName === 'svg') {
      el.appendChild(document.importNode(svg, true));
    }
  }

  // Zoom + pan for mermaid diagrams
  function addZoomPan(wrap, inner) {
    var scale = 1, tx = 0, ty = 0;
    var dragging = false, startX, startY, startTx, startTy;

    function apply() {
      inner.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    }

    function resetView() { scale = 1; tx = 0; ty = 0; apply(); }

    var controls = document.createElement('div');
    controls.className = 'mermaid-controls';
    var btnIn = document.createElement('button');
    btnIn.textContent = '+';
    btnIn.title = 'Zoom in';
    btnIn.addEventListener('click', function(e) { e.stopPropagation(); scale = Math.min(scale * 1.25, 5); apply(); });
    var btnOut = document.createElement('button');
    btnOut.textContent = '\\u2212';
    btnOut.title = 'Zoom out';
    btnOut.addEventListener('click', function(e) { e.stopPropagation(); scale = Math.max(scale / 1.25, 0.2); apply(); });
    var btnReset = document.createElement('button');
    btnReset.textContent = '\\u21ba';
    btnReset.title = 'Reset zoom';
    btnReset.addEventListener('click', function(e) { e.stopPropagation(); resetView(); });
    controls.appendChild(btnIn);
    controls.appendChild(btnOut);
    controls.appendChild(btnReset);
    wrap.appendChild(controls);

    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      var rect = wrap.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var oldScale = scale;
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.min(Math.max(scale * delta, 0.2), 5);
      tx = mx - (mx - tx) * (scale / oldScale);
      ty = my - (my - ty) * (scale / oldScale);
      apply();
    }, { passive: false });

    wrap.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      dragging = true; startX = e.clientX; startY = e.clientY;
      startTx = tx; startTy = ty;
    });
    window.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      tx = startTx + (e.clientX - startX);
      ty = startTy + (e.clientY - startY);
      apply();
    });
    window.addEventListener('mouseup', function() { dragging = false; });
  }

  var nav = document.getElementById('nav');
  var content = document.getElementById('content');
  var footer = document.getElementById('footer');

  document.getElementById('sidebar-toggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
  });

  function buildNav() {
    var el = document.createElement('div');

    var overviewLink = document.createElement('a');
    overviewLink.className = 'nav-item overview active';
    overviewLink.dataset.target = 'overview';
    overviewLink.textContent = 'Overview';
    overviewLink.addEventListener('click', onNavClick);
    el.appendChild(overviewLink);

    if (data.modules.length > 0) {
      var section = document.createElement('div');
      section.className = 'nav-section';
      section.textContent = 'Modules';
      el.appendChild(section);

      data.modules.forEach(function(m) {
        var link = document.createElement('a');
        link.className = 'nav-item';
        link.dataset.target = m.slug;
        link.textContent = m.name;
        link.addEventListener('click', onNavClick);
        el.appendChild(link);
      });
    }

    nav.appendChild(el);
  }

  function onNavClick(e) {
    nav.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    e.currentTarget.classList.add('active');
    currentTarget = e.currentTarget.dataset.target;
    showContent(currentTarget);
    document.getElementById('sidebar').classList.remove('open');
  }

  function showContent(target) {
    var md = '';
    if (target === 'overview') {
      md = data.overview;
    } else {
      var mod = data.modules.find(function(m) { return m.slug === target; });
      if (mod) md = mod.content;
    }

    if (!md) {
      content.textContent = '';
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      var h2 = document.createElement('h2');
      h2.textContent = 'No docs yet';
      var p = document.createElement('p');
      p.textContent = 'Run repo-architect first to generate architecture documentation.';
      emptyDiv.appendChild(h2);
      emptyDiv.appendChild(p);
      content.appendChild(emptyDiv);
      return;
    }

    // Safe: rendering trusted local markdown content via marked.js
    // Data sourced exclusively from user's own docs/architecture/ files
    content.innerHTML = renderMarkdown(md);
    window.scrollTo(0, 0);

    renderMermaidDiagrams();
  }

  if (data.lastRunAt) {
    footer.textContent = 'Last updated ' + new Date(data.lastRunAt).toLocaleDateString();
  }

  buildNav();
  showContent('overview');
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
