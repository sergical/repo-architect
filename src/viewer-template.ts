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
  history: { commitSha: string; date: string; summary: string; moduleCount: number }[];
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
export function getViewerHtml(data: ViewerData, options?: { static?: boolean }): string {
  const isStatic = options?.static ?? false;
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

  /* Search */
  .search-wrap {
    position: relative; margin-bottom: 16px;
  }
  .search-input {
    width: 100%; padding: 8px 12px; padding-right: 36px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-size: 13px; font-family: inherit;
    outline: none; transition: border-color 0.15s;
  }
  .search-input::placeholder { color: var(--muted); opacity: 0.5; }
  .search-input:focus { border-color: var(--accent); }
  .search-hint {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    background: var(--surface); border: 1px solid var(--border); border-radius: 4px;
    padding: 1px 6px; font-size: 11px; color: var(--muted); pointer-events: none;
    font-family: 'Geist Mono', monospace;
  }
  .search-input:focus + .search-hint { display: none; }
  .no-results {
    padding: 12px; font-size: 13px; color: var(--muted); opacity: 0.6; text-align: center;
  }

  /* Breadcrumb */
  .breadcrumb {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 16px; font-size: 13px; color: var(--muted);
  }
  .breadcrumb a {
    color: var(--accent); text-decoration: none; cursor: pointer;
  }
  .breadcrumb a:hover { text-decoration: underline; }
  .breadcrumb-sep { color: var(--border); }
  .breadcrumb-current { color: var(--text); font-weight: 500; }

  /* History section */
  .history-section {
    border-top: 1px solid var(--border); margin-top: 12px; padding-top: 4px;
  }
  .history-toggle {
    display: flex; align-items: center; gap: 6px; cursor: pointer;
    font-size: 11px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 8px 12px 4px; opacity: 0.6; background: none; border: none;
    width: 100%; text-align: left; font-family: inherit;
  }
  .history-toggle:hover { opacity: 1; }
  .history-toggle .arrow { transition: transform 0.15s; font-size: 10px; }
  .history-toggle.expanded .arrow { transform: rotate(90deg); }
  .history-list { display: none; }
  .history-list.visible { display: block; }
  .history-item {
    display: block; padding: 6px 12px; margin-bottom: 1px;
    border-radius: 6px; cursor: pointer; font-size: 12px;
    color: var(--muted); text-decoration: none; transition: all 0.15s;
    line-height: 1.4;
  }
  .history-item:hover { background: var(--hover-bg); color: var(--text); }
  .history-item.active { background: var(--active-bg); color: var(--accent); }
  .history-date { font-size: 11px; opacity: 0.7; }
  .history-summary {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    display: block; max-width: 210px;
  }
  .history-modules { font-size: 10px; opacity: 0.5; }

  /* Snapshot banner */
  .snapshot-banner {
    background: #78350f; color: #fef3c7; padding: 10px 16px;
    border-radius: 8px; margin-bottom: 20px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 13px;
  }
  :root[data-theme="light"] .snapshot-banner {
    background: #fef3c7; color: #78350f;
  }
  .snapshot-banner a {
    color: inherit; text-decoration: underline; cursor: pointer;
    font-weight: 600;
  }

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
  <div class="search-wrap">
    <input type="text" class="search-input" id="search" placeholder="Search modules..." autocomplete="off">
    <span class="search-hint">/</span>
  </div>
  <div id="nav"></div>
  <div class="sidebar-footer" id="footer"></div>
</nav>

<main class="main" id="content"></main>

${isStatic ? '<script>window.__STATIC_MODE__ = true;</script>\n' : ''}<script>window.__ARCH_DATA__ = ${jsonPayload};</script>
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
// Local-only viewer: all data comes from the user's own docs/architecture/ files.
// Safe usage of innerHTML/setHTMLUnsafe: renders trusted local markdown via marked.js
// and mermaid SVG output — both sourced exclusively from user's own filesystem.
(function() {
  var data = window.__ARCH_DATA__;

  // Helper: set trusted HTML content (local-only data from user's filesystem)
  function setTrustedHtml(el, html) { el.innerHTML = html; }

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
  var searchInput = document.getElementById('search');

  // Snapshot state
  var snapshotData = null;
  var snapshotSha = null;
  var snapshotCache = {};

  document.getElementById('sidebar-toggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // --- Hash routing ---
  function targetFromHash() {
    var h = window.location.hash.replace('#', '');
    if (!h || h === 'overview') return 'overview';
    if (h.startsWith('history/')) return h;
    var found = data.modules.find(function(m) { return m.slug === h; });
    return found ? h : 'overview';
  }

  function navigateTo(target) {
    var hash = target === 'overview' ? '#overview' : '#' + target;
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      onHashChange();
    }
  }

  async function onHashChange() {
    currentTarget = targetFromHash();

    if (currentTarget.startsWith('history/')) {
      var sha = currentTarget.replace('history/', '');
      await loadSnapshot(sha);
    } else {
      snapshotData = null;
      snapshotSha = null;
    }

    updateActiveNav();
    showContent(currentTarget);
    document.getElementById('sidebar').classList.remove('open');
  }

  window.addEventListener('hashchange', onHashChange);

  async function loadSnapshot(sha) {
    if (window.__STATIC_MODE__) return;
    if (snapshotCache[sha]) {
      snapshotData = snapshotCache[sha];
      snapshotSha = sha;
      return;
    }
    try {
      var resp = await fetch('/api/snapshot?sha=' + encodeURIComponent(sha));
      if (resp.ok) {
        snapshotData = await resp.json();
        snapshotCache[sha] = snapshotData;
        snapshotSha = sha;
      }
    } catch (e) {
      snapshotData = null;
      snapshotSha = null;
    }
  }

  // --- Search / filter ---
  function getVisibleNavItems() {
    return Array.from(nav.querySelectorAll('.nav-item.module-item')).filter(function(el) {
      return el.style.display !== 'none';
    });
  }

  function applyFilter() {
    var query = searchInput.value.toLowerCase().trim();
    var moduleItems = nav.querySelectorAll('.nav-item.module-item');
    var anyVisible = false;
    moduleItems.forEach(function(el) {
      var name = el.textContent.toLowerCase();
      var show = !query || name.includes(query);
      el.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });

    var noResults = nav.querySelector('.no-results');
    if (query && !anyVisible) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No modules found';
        nav.appendChild(noResults);
      }
    } else if (noResults) {
      noResults.remove();
    }
  }

  searchInput.addEventListener('input', applyFilter);

  // --- Build nav ---
  function buildNav() {
    var el = document.createElement('div');

    var overviewLink = document.createElement('a');
    overviewLink.className = 'nav-item overview';
    overviewLink.dataset.target = 'overview';
    overviewLink.textContent = 'Overview';
    overviewLink.addEventListener('click', function() { navigateTo('overview'); });
    el.appendChild(overviewLink);

    if (data.modules.length > 0) {
      var section = document.createElement('div');
      section.className = 'nav-section';
      section.textContent = 'Modules';
      el.appendChild(section);

      data.modules.forEach(function(m) {
        var link = document.createElement('a');
        link.className = 'nav-item module-item';
        link.dataset.target = m.slug;
        link.textContent = m.name;
        link.addEventListener('click', function() { navigateTo(m.slug); });
        el.appendChild(link);
      });
    }

    // History section (skip in static mode — no server for snapshot API)
    if (data.history && data.history.length > 0 && !window.__STATIC_MODE__) {
      var histSection = document.createElement('div');
      histSection.className = 'history-section';

      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'history-toggle';
      var arrowSpan = document.createElement('span');
      arrowSpan.className = 'arrow';
      arrowSpan.textContent = '\\u25B6';
      toggleBtn.appendChild(arrowSpan);
      toggleBtn.appendChild(document.createTextNode(' History (' + data.history.length + ')'));

      var histList = document.createElement('div');
      histList.className = 'history-list';

      toggleBtn.addEventListener('click', function() {
        toggleBtn.classList.toggle('expanded');
        histList.classList.toggle('visible');
      });

      data.history.forEach(function(snap, i) {
        var item = document.createElement('a');
        item.className = 'history-item';
        item.dataset.target = 'history/' + snap.commitSha;

        var dateStr = new Date(snap.date).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        });

        var dateSpan = document.createElement('span');
        dateSpan.className = 'history-date';
        dateSpan.textContent = dateStr;
        if (i === 0) dateSpan.textContent += ' (latest)';

        var summarySpan = document.createElement('span');
        summarySpan.className = 'history-summary';
        summarySpan.textContent = snap.summary;
        summarySpan.title = snap.summary;

        var modulesSpan = document.createElement('span');
        modulesSpan.className = 'history-modules';
        modulesSpan.textContent = snap.moduleCount + ' module' + (snap.moduleCount !== 1 ? 's' : '');

        item.appendChild(dateSpan);
        item.appendChild(summarySpan);
        item.appendChild(modulesSpan);

        item.addEventListener('click', function() {
          navigateTo('history/' + snap.commitSha);
        });
        histList.appendChild(item);
      });

      histSection.appendChild(toggleBtn);
      histSection.appendChild(histList);
      el.appendChild(histSection);
    }

    nav.appendChild(el);
  }

  function updateActiveNav() {
    nav.querySelectorAll('.nav-item').forEach(function(n) {
      n.classList.toggle('active', n.dataset.target === currentTarget);
    });
    nav.querySelectorAll('.history-item').forEach(function(n) {
      n.classList.toggle('active', n.dataset.target === currentTarget);
    });
  }

  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function showContent(target) {
    var md = '';
    var moduleName = '';
    var isSnapshot = target.startsWith('history/');

    if (isSnapshot && snapshotData) {
      md = snapshotData.overview;
    } else if (target === 'overview') {
      md = data.overview;
    } else {
      var mod = data.modules.find(function(m) { return m.slug === target; });
      if (mod) { md = mod.content; moduleName = mod.name; }
    }

    if (!md) {
      content.textContent = '';
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      var h2 = document.createElement('h2');
      h2.textContent = isSnapshot ? 'Snapshot not found' : 'No docs yet';
      var p = document.createElement('p');
      p.textContent = isSnapshot
        ? 'Could not load this snapshot from git history.'
        : 'Run repo-architect first to generate architecture documentation.';
      emptyDiv.appendChild(h2);
      emptyDiv.appendChild(p);
      content.appendChild(emptyDiv);
      return;
    }

    // Trusted local markdown content via marked.js
    // Data sourced exclusively from user's own docs/architecture/ files
    var htmlStr = renderMarkdown(md);

    content.textContent = '';

    // Snapshot banner
    if (isSnapshot && snapshotSha) {
      var snapInfo = data.history.find(function(h) { return h.commitSha === snapshotSha; });
      var banner = document.createElement('div');
      banner.className = 'snapshot-banner';
      var bannerText = document.createElement('span');
      var dateLabel = snapInfo ? new Date(snapInfo.date).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      }) : snapshotSha.substring(0, 7);
      bannerText.textContent = 'Viewing snapshot from ' + dateLabel;
      var backLink = document.createElement('a');
      backLink.textContent = 'Back to current';
      backLink.addEventListener('click', function() { navigateTo('overview'); });
      banner.appendChild(bannerText);
      banner.appendChild(backLink);
      content.appendChild(banner);

      // Module nav for snapshot
      if (snapshotData && snapshotData.modules && snapshotData.modules.length > 0) {
        var snapNav = document.createElement('div');
        snapNav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;';
        snapshotData.modules.forEach(function(m) {
          var btn = document.createElement('button');
          btn.textContent = m.name;
          btn.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--muted);font-size:12px;cursor:pointer;font-family:inherit;';
          btn.addEventListener('click', function() {
            showSnapshotModule(m);
          });
          snapNav.appendChild(btn);
        });
        content.appendChild(snapNav);
      }
    }

    // Breadcrumb for module pages (non-snapshot)
    if (!isSnapshot && target !== 'overview' && moduleName) {
      var bcDiv = document.createElement('div');
      bcDiv.className = 'breadcrumb';
      var bcLink = document.createElement('a');
      bcLink.textContent = 'Overview';
      bcLink.addEventListener('click', function() { navigateTo('overview'); });
      var bcSep = document.createElement('span');
      bcSep.className = 'breadcrumb-sep';
      bcSep.textContent = '/';
      var bcCurrent = document.createElement('span');
      bcCurrent.className = 'breadcrumb-current';
      bcCurrent.textContent = moduleName;
      bcDiv.appendChild(bcLink);
      bcDiv.appendChild(bcSep);
      bcDiv.appendChild(bcCurrent);
      content.appendChild(bcDiv);
    }

    var bodyDiv = document.createElement('div');
    setTrustedHtml(bodyDiv, htmlStr);
    content.appendChild(bodyDiv);
    window.scrollTo(0, 0);

    renderMermaidDiagrams();
  }

  function showSnapshotModule(mod) {
    content.textContent = '';

    var snapInfo = data.history.find(function(h) { return h.commitSha === snapshotSha; });
    var banner = document.createElement('div');
    banner.className = 'snapshot-banner';
    var bannerText = document.createElement('span');
    var dateLabel = snapInfo ? new Date(snapInfo.date).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    }) : snapshotSha.substring(0, 7);
    bannerText.textContent = 'Viewing snapshot from ' + dateLabel + ' / ' + mod.name;
    var backLink = document.createElement('a');
    backLink.textContent = 'Back to snapshot overview';
    backLink.addEventListener('click', function() {
      showContent('history/' + snapshotSha);
    });
    banner.appendChild(bannerText);
    banner.appendChild(backLink);
    content.appendChild(banner);

    var htmlStr = renderMarkdown(mod.content);
    var bodyDiv = document.createElement('div');
    setTrustedHtml(bodyDiv, htmlStr);
    content.appendChild(bodyDiv);
    window.scrollTo(0, 0);
    renderMermaidDiagrams();
  }

  // --- Keyboard navigation ---
  document.addEventListener('keydown', function(e) {
    var tag = (e.target || e.srcElement).tagName;
    var isInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === '/' && !isInput) {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    if (e.key === 'Escape') {
      searchInput.value = '';
      applyFilter();
      searchInput.blur();
      return;
    }

    if (isInput) return;

    if (e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      var allItems = [nav.querySelector('.nav-item.overview')].concat(getVisibleNavItems());
      allItems = allItems.filter(Boolean);
      var curIdx = allItems.findIndex(function(el) { return el.dataset.target === currentTarget; });
      if (e.key === 'j' || e.key === 'ArrowDown') {
        curIdx = Math.min(curIdx + 1, allItems.length - 1);
      } else {
        curIdx = Math.max(curIdx - 1, 0);
      }
      var nextTarget = allItems[curIdx].dataset.target;
      navigateTo(nextTarget);
    }
  });

  if (data.lastRunAt) {
    footer.textContent = 'Last updated ' + new Date(data.lastRunAt).toLocaleDateString();
  }

  buildNav();

  // Auto-expand history section if navigating to a snapshot
  if (window.location.hash && window.location.hash.startsWith('#history/')) {
    var histToggle = nav.querySelector('.history-toggle');
    var histList = nav.querySelector('.history-list');
    if (histToggle && histList) {
      histToggle.classList.add('expanded');
      histList.classList.add('visible');
    }
  }

  // Initial navigation from hash (or default to overview)
  if (window.location.hash) {
    onHashChange();
  } else {
    navigateTo('overview');
  }
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
