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
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a; color: #e0e0e0;
    display: flex; min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 260px; min-width: 260px;
    background: #111; border-right: 1px solid #222;
    padding: 24px 16px; display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto;
    z-index: 10;
  }
  .sidebar-brand {
    font-size: 14px; font-weight: 600; color: #888;
    letter-spacing: 0.05em; text-transform: uppercase;
    margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #222;
  }
  .sidebar-brand span { color: #c084fc; }
  .nav-item {
    display: block; padding: 8px 12px; margin-bottom: 2px;
    border-radius: 6px; cursor: pointer; font-size: 14px;
    color: #aaa; text-decoration: none; transition: all 0.15s;
  }
  .nav-item:hover { background: #1a1a1a; color: #e0e0e0; }
  .nav-item.active { background: #1e1b2e; color: #c084fc; }
  .nav-item.overview { font-weight: 600; color: #ccc; margin-bottom: 12px; }
  .nav-item.overview.active { color: #c084fc; }
  .nav-section {
    font-size: 11px; font-weight: 600; color: #555;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 8px 12px 4px; margin-top: 8px;
  }
  .sidebar-footer {
    margin-top: auto; padding-top: 16px; border-top: 1px solid #222;
    font-size: 12px; color: #444;
  }

  /* Toggle button for mobile */
  .sidebar-toggle {
    display: none; position: fixed; top: 12px; left: 12px; z-index: 20;
    background: #1a1a1a; border: 1px solid #333; border-radius: 6px;
    color: #aaa; padding: 8px 12px; cursor: pointer; font-size: 14px;
  }

  /* Main content */
  .main { margin-left: 260px; flex: 1; padding: 48px 64px; max-width: 900px; }

  /* Markdown styles */
  .main h1 { font-size: 2em; font-weight: 700; margin-bottom: 8px; color: #f0f0f0; }
  .main h2 {
    font-size: 1.4em; font-weight: 600; margin-top: 40px; margin-bottom: 16px;
    color: #e0e0e0; padding-bottom: 8px; border-bottom: 1px solid #222;
  }
  .main h3 { font-size: 1.15em; font-weight: 600; margin-top: 28px; margin-bottom: 12px; color: #d0d0d0; }
  .main p { line-height: 1.7; margin-bottom: 16px; color: #bbb; }
  .main a { color: #a78bfa; text-decoration: none; }
  .main a:hover { text-decoration: underline; }
  .main ul, .main ol { margin-bottom: 16px; padding-left: 24px; color: #bbb; }
  .main li { margin-bottom: 6px; line-height: 1.6; }
  .main blockquote {
    border-left: 3px solid #333; padding: 8px 16px; margin-bottom: 16px;
    color: #888; font-style: italic;
  }
  .main code {
    background: #1a1a1a; padding: 2px 6px; border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.9em; color: #c084fc;
  }
  .main pre {
    background: #111; border: 1px solid #222; border-radius: 8px;
    padding: 16px; margin-bottom: 20px; overflow-x: auto;
  }
  .main pre code { background: none; padding: 0; color: #ccc; }
  .main table {
    width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em;
  }
  .main th {
    text-align: left; padding: 10px 12px; border-bottom: 2px solid #333;
    color: #aaa; font-weight: 600;
  }
  .main td { padding: 10px 12px; border-bottom: 1px solid #1a1a1a; color: #bbb; }
  .main tr:hover td { background: #111; }
  .main img { max-width: 100%; border-radius: 8px; }
  .main hr { border: none; border-top: 1px solid #222; margin: 32px 0; }

  /* Mermaid diagrams */
  .mermaid-wrap {
    background: #111; border: 1px solid #222; border-radius: 8px;
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
    background: #1a1a1a; border: 1px solid #333; border-radius: 4px;
    color: #888; width: 28px; height: 28px; cursor: pointer;
    font-size: 14px; display: flex; align-items: center; justify-content: center;
  }
  .mermaid-controls button:hover { color: #ccc; border-color: #555; }
  .mermaid-error {
    background: #1a1212; border: 1px solid #332222; border-radius: 8px;
    padding: 16px; margin-bottom: 20px;
  }
  .mermaid-error summary {
    color: #c07070; cursor: pointer; font-size: 13px; margin-bottom: 8px;
  }
  .mermaid-error pre {
    margin: 0; border: none; background: transparent; font-size: 13px; color: #888;
  }

  /* Empty state */
  .empty-state {
    text-align: center; padding: 80px 40px;
  }
  .empty-state h2 { border: none; color: #888; }
  .empty-state p { color: #555; }
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
  <div class="sidebar-brand"><span>repo</span>-architect</div>
  <div id="nav"></div>
  <div class="sidebar-footer" id="footer"></div>
</nav>

<main class="main" id="content"></main>

<script>window.__ARCH_DATA__ = ${jsonPayload};</script>
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
// Local-only viewer: all data comes from the user's own docs/architecture/ files.
// innerHTML is used intentionally to render trusted local markdown via marked.js.
(function() {
  var data = window.__ARCH_DATA__;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    suppressErrorRendering: true,
    themeVariables: {
      darkMode: true,
      background: '#111',
      primaryColor: '#2d2250',
      primaryTextColor: '#e0e0e0',
      primaryBorderColor: '#444',
      lineColor: '#555',
      secondaryColor: '#1a1a2e',
      tertiaryColor: '#1a1a1a',
    },
  });

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
    // Quote unquoted edge labels containing special chars: |label| -> |"label"|
    fixed = fixed.replace(/\\|([^"|][^|]*[/\\\\@#&;][^|]*)\\|/g, '|"$1"|');
    // Remove trailing whitespace on lines (some mermaid versions choke on it)
    fixed = fixed.replace(/[ \\t]+$/gm, '');
    return fixed;
  }

  async function tryRenderMermaid(id, src) {
    try {
      return await mermaid.render(id, src);
    } catch (e) {
      // Try auto-fixed version
      var fixed = fixMermaidSyntax(src);
      if (fixed !== src) {
        return await mermaid.render(id + '-fix', fixed);
      }
      throw e;
    }
  }

  // Render mermaid diagrams via API (no HTML escaping issues)
  async function renderMermaidDiagrams() {
    var wraps = content.querySelectorAll('.mermaid-wrap');
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var idx = parseInt(wrap.dataset.idx, 10);
      var src = mermaidSources[idx];
      var inner = wrap.querySelector('.mermaid-inner');
      try {
        var result = await tryRenderMermaid('mermaid-' + Date.now() + '-' + idx, src);
        inner.innerHTML = result.svg;
        addZoomPan(wrap, inner);
      } catch (err) {
        // Show raw code on error
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

  // Zoom + pan for mermaid diagrams
  function addZoomPan(wrap, inner) {
    var scale = 1, tx = 0, ty = 0;
    var dragging = false, startX, startY, startTx, startTy;

    function apply() {
      inner.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    }

    function resetView() { scale = 1; tx = 0; ty = 0; apply(); }

    // Zoom controls
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

    // Wheel zoom
    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      var rect = wrap.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var oldScale = scale;
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      scale = Math.min(Math.max(scale * delta, 0.2), 5);
      // Zoom toward cursor
      tx = mx - (mx - tx) * (scale / oldScale);
      ty = my - (my - ty) * (scale / oldScale);
      apply();
    }, { passive: false });

    // Drag pan
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
    showContent(e.currentTarget.dataset.target);
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

    // Rendering trusted local markdown content via marked.js
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
