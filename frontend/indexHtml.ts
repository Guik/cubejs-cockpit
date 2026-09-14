import { APP_VERSION } from "../shared/version";

// Embedded as a TS string constant, not read from disk at runtime:
// Encore's build step only bundles compiled TS output, it doesn't copy
// arbitrary static files (public/index.html isn't present in
// .encore/build/... even though it exists in source) -- so a
// filesystem read here works in `encore run` from source but 404s once
// built into a Docker image. Embedding it in TS makes it part of the
// same compiled bundle as everything else, guaranteed to ship together.
export const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>cubejs-cockpit</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; background: #0b0d10; color: #e6e6e6; }
  header { padding: 14px 20px; border-bottom: 1px solid #23262b; display: flex; gap: 16px; align-items: center; }
  header h1 { font-size: 15px; margin: 0; font-weight: 600; color: #9aa4b2; }
  nav { display: flex; gap: 4px; }
  nav button { background: none; border: none; color: #9aa4b2; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  nav button.active { background: #1a1d22; color: #fff; }
  main { padding: 20px; max-width: 1800px; margin: 0 auto; }
  section { display: none; }
  section.active { display: block; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin: 24px 0 10px; }
  h2:first-child { margin-top: 0; }
  .subnav { display: flex; gap: 4px; border-bottom: 1px solid #23262b; margin-bottom: 16px; }
  .subnav button { background: none; border: none; color: #9aa4b2; padding: 8px 4px; margin-right: 16px; cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; }
  .subnav button.active { color: #fff; border-bottom-color: #4ade80; }
  .controls-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
  .timerange-bar { display: flex; gap: 6px; margin-bottom: 16px; position: relative; }
  .timerange-bar button { background: #111318; border: 1px solid #23262b; color: #9aa4b2; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .timerange-bar button:hover { border-color: #3b4252; }
  .timerange-bar button.active { background: #1a1d22; color: #fff; border-color: #4ade80; }
  .timerange-popover { position: absolute; top: 100%; right: 0; margin-top: 6px; z-index: 60; background: #111318; border: 1px solid #23262b; border-radius: 8px; padding: 12px; min-width: 280px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
  .timerange-popover-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin: 0 0 6px; }
  .timerange-extra-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .timerange-custom-fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
  .timerange-custom-fields label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #9aa4b2; }
  .timerange-custom-fields input[type="datetime-local"] { background: #0b0d10; border: 1px solid #23262b; color: #e6e6e6; border-radius: 6px; padding: 5px 8px; font-size: 12px; font-family: inherit; }
  .timerange-popover-error { color: #f87171; font-size: 11px; margin: -4px 0 8px; }
  .timerange-popover-apply { width: 100%; background: #123a20; border: 1px solid #4ade80; color: #4ade80; border-radius: 6px; padding: 6px 0; font-size: 12px; cursor: pointer; }
  .timerange-popover-apply:hover { background: #164a28; }
  .subpanel { display: none; }
  .subpanel.active { display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #1c1f24; vertical-align: top; }
  th { color: #6b7280; font-weight: 500; }
  .filterable-th { position: relative; padding-right: 26px; }
  .col-filter-btn {
    display: inline-flex; align-items: center; justify-content: center;
    position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
    width: 18px; height: 18px; background: #1a1d22; border: 1px solid #2c3038; color: #9aa4b2;
    cursor: pointer; border-radius: 5px; padding: 0;
  }
  .col-filter-btn svg { display: block; width: 11px; height: 11px; }
  .col-filter-btn:hover { border-color: #3b4252; color: #fff; }
  .col-filter-btn.active { background: #123a20; border-color: #4ade80; color: #4ade80; }
  .col-filter-popover { position: absolute; top: 100%; left: 0; z-index: 50; background: #111318; border: 1px solid #23262b; border-radius: 8px; padding: 8px; min-width: 200px; max-width: 280px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); font-weight: 400; text-transform: none; letter-spacing: normal; white-space: normal; }
  .col-filter-search { width: 100%; box-sizing: border-box; margin-bottom: 6px; background: #0b0d10; border: 1px solid #23262b; color: #e6e6e6; border-radius: 6px; padding: 4px 8px; font-size: 12px; font-family: inherit; }
  .col-filter-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; }
  .col-filter-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #e6e6e6; padding: 3px 4px; border-radius: 4px; cursor: pointer; }
  .col-filter-item:hover { background: #1a1d22; }
  .col-filter-item span:first-of-type { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .col-filter-count { color: #6b7280; font-size: 11px; }
  .col-filter-actions { display: flex; gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #23262b; }
  .col-filter-actions button { flex: 1; background: #1a1d22; border: 1px solid #23262b; color: #9aa4b2; border-radius: 6px; padding: 3px 0; font-size: 11px; cursor: pointer; }
  .col-filter-actions button:hover { border-color: #3b4252; color: #fff; }
  .col-filter-empty { color: #6b7280; font-size: 12px; padding: 6px 0; text-align: center; }
  .filter-clear-btn { background: none; border: none; color: #f9a8d4; cursor: pointer; font-size: 12px; padding: 0; text-decoration: underline; }
  code, pre { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12.5px; }
  pre { background: #0b0d10; border: 1px solid #23262b; border-radius: 8px; padding: 14px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  .cube-block { border: 1px solid #23262b; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
  .cube-block h3 { margin: 0 0 8px; font-size: 14px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; background: #1a1d22; color: #9aa4b2; margin-left: 6px; white-space: nowrap; }
  .pill.built { background: #123a20; color: #4ade80; }
  .pill.empty { background: #2a2113; color: #facc15; }
  .pill.type-time { background: #2a1e3a; color: #c4b5fd; }
  .pill.type-string { background: #123a2e; color: #5eead4; }
  .pill.type-number { background: #1e2a3a; color: #7dd3fc; }
  .pill.type-agg { background: #3a2313; color: #fdba74; }
  .pill.type-other { background: #1a1d22; color: #9aa4b2; }

  /* Hand-rolled JS syntax highlighting (schema source view) -- no
     external highlighter dependency, keeps this a single embedded file. */
  .tok-comment { color: #6b7280; font-style: italic; }
  .tok-string { color: #a3e635; }
  .tok-keyword { color: #7dd3fc; }
  .tok-number { color: #fdba74; }

  /* Query history: pastel status pills + JSON syntax coloring */
  .pill.status-success { background: #163a2e; color: #86efac; }
  .pill.status-error { background: #3a1e2e; color: #f9a8d4; }
  .pill.status-pending { background: #3a3313; color: #fde68a; }
  .pill.source-preagg { background: #1e2a3a; color: #93c5fd; }
  .pill.source-scan { background: #3a2313; color: #fdba74; }
  .pill.source-unknown { background: #1a1d22; color: #6b7280; }
  .pill.cache-stale { background: #3a3313; color: #fde68a; margin-left: 4px; }
  .pill.cachetype-in-memory { background: #163a2e; color: #86efac; }
  .pill.cachetype-cube-store-cache { background: #1e2a3a; color: #93c5fd; }
  .pill.cachetype-pre-aggregation { background: #2a1e3a; color: #c4b5fd; }
  .pill.cachetype-source { background: #3a2313; color: #fdba74; }
  .pill.cachetype-unknown { background: #1a1d22; color: #6b7280; }
  .pill.kind-auth { background: #3a1e2e; color: #f9a8d4; }
  .pill.kind-preagg-build { background: #3a2313; color: #fdba74; }
  .pill.kind-compile { background: #2a1e3a; color: #c4b5fd; }
  .error-message { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: #d1d5db; }
  .json-key { color: #93c5fd; }
  .json-string { color: #86efac; }
  .json-number { color: #fdba74; }
  .json-boolean, .json-null { color: #c4b5fd; }
  .json-punct { color: #6b7280; }
  .query-preview { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }

  /* Chart.js-backed charts -- see the "Charts" section below. */
  .charts-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
  .compile-note { font-size: 12px; color: #6b7280; margin: -10px 0 20px; }
  .chart-card { border: 1px solid #23262b; border-radius: 10px; padding: 14px 16px; flex: 1; min-width: 360px; }
  .chart-card h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; font-weight: 500; }
  .chart-canvas-wrap { position: relative; height: 220px; }
  .chart-empty { color: #6b7280; font-size: 13px; padding: 20px 0; text-align: center; }
  .muted { color: #6b7280; }
  .err { color: #f87171; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; }
  .loading { color: #6b7280; font-size: 13px; }

  /* Filter bar */
  .filter-bar { display: flex; gap: 8px; margin-bottom: 12px; }
  .filter-bar select, .filter-bar input { background: #111318; border: 1px solid #23262b; color: #e6e6e6; padding: 6px 10px; border-radius: 6px; font-size: 13px; font-family: inherit; }
  .filter-bar input { flex: 1; max-width: 320px; }
  .filter-bar select:focus, .filter-bar input:focus { outline: 1px solid #3b4252; }

  /* Build history tab */
  .info-card { border: 1px solid #23262b; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
  .info-card code { color: #cbd5e1; background: #1a1d22; padding: 1px 5px; border-radius: 4px; }

  /* Help tooltip -- a small "?" that reveals longer explanatory text on
     hover/focus instead of it sitting inline, permanently visible.
     CSS-only (no open/close state to manage): the content is always in
     the DOM, just hidden until :hover or :focus, so it also works via
     keyboard (tab to the icon) without any JS. */
  .help-tip { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; border-radius: 50%; background: #1a1d22; border: 1px solid #2c3038; color: #6b7280; font-size: 10px; font-style: normal; font-weight: 600; cursor: help; margin-left: 5px; vertical-align: middle; }
  .help-tip:hover, .help-tip:focus { color: #fff; border-color: #3b4252; outline: none; }
  .help-tip-content { visibility: hidden; opacity: 0; position: absolute; bottom: 130%; left: 50%; transform: translateX(-50%); width: 320px; max-width: 70vw; background: #111318; border: 1px solid #23262b; border-radius: 8px; padding: 10px 12px; font-size: 11.5px; line-height: 1.6; color: #9aa4b2; font-weight: 400; text-align: left; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 80; transition: opacity 0.1s; pointer-events: none; }
  .help-tip:hover .help-tip-content, .help-tip:focus .help-tip-content { visibility: visible; opacity: 1; }
  .help-tip-content code { color: #cbd5e1; background: #1a1d22; padding: 1px 5px; border-radius: 4px; }
  .gen-list { list-style: none; margin: 0; padding: 0; }
  .gen-list li { padding: 5px 0; border-bottom: 1px solid #1c1f24; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; display: flex; justify-content: space-between; gap: 12px; }
  .gen-list li:last-child { border-bottom: none; }

  /* Sortable headers -- shared by every array view (pre-aggregations,
     query history, build history), not just the partitions table. */
  th.sortable-th { cursor: pointer; user-select: none; white-space: nowrap; }
  th.sortable-th:hover { color: #cbd5e1; }
  th.sortable-th .arrow { display: inline-block; width: 10px; opacity: 0.6; }
  #preagg-table tbody tr { cursor: pointer; }
  #preagg-table tbody tr:hover { background: #14171c; }
  #preagg-table td.mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; }

  /* Details overlay */
  .overlay-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; z-index: 100; overflow-y: auto; }
  .overlay-backdrop[hidden] { display: none; }
  .overlay-panel { background: #111318; border: 1px solid #23262b; border-radius: 12px; max-width: 860px; width: 100%; margin-bottom: 40px; }
  .overlay-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #23262b; position: sticky; top: 0; background: #111318; border-radius: 12px 12px 0 0; }
  .overlay-header h3 { margin: 0; font-size: 13.5px; font-family: ui-monospace, "SF Mono", Menlo, monospace; word-break: break-word; }
  .close-btn { background: none; border: none; color: #9aa4b2; font-size: 20px; cursor: pointer; line-height: 1; padding: 4px 8px; flex-shrink: 0; }
  .close-btn:hover { color: #fff; }
  .overlay-body { padding: 16px 18px; }
  .field-grid { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 13px; margin-bottom: 16px; }
  .field-grid dt { color: #6b7280; }
  .field-grid dd { margin: 0; }
  .stat-tiles { display: flex; gap: 10px; margin-bottom: 18px; }
  .stat-tile { flex: 1; min-width: 0; border: 1px solid #23262b; border-radius: 10px; padding: 10px 14px; }
  .stat-tile .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin-bottom: 5px; }
  .stat-tile .stat-value { font-size: 16px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stat-tile .stat-value .pill { font-size: 13px; }
  .overlay-subnav { display: flex; gap: 4px; border-bottom: 1px solid #23262b; margin-bottom: 14px; }
  .overlay-subnav button { background: none; border: none; color: #9aa4b2; padding: 6px 4px; margin-right: 14px; cursor: pointer; font-size: 12px; border-bottom: 2px solid transparent; }
  .overlay-subnav button.active { color: #fff; border-bottom-color: #4ade80; }
  .overlay-subpanel { display: none; }
  .overlay-subpanel.active { display: block; }
  details { border: 1px solid #23262b; border-radius: 8px; margin-top: 8px; }
  summary { padding: 8px 12px; cursor: pointer; font-size: 13px; }
  details[open] summary { border-bottom: 1px solid #23262b; }
  .detail-body { padding: 10px 12px; }
</style>
</head>
<body>
<header>
  <h1>cubejs-cockpit <span class="pill" title="Image version">${APP_VERSION}</span> &middot; self-hosted</h1>
  <nav>
    <button data-tab="model" class="active">Data model</button>
    <button data-tab="preaggs">Pre-aggregations</button>
    <button data-tab="queries">Query history</button>
    <button data-tab="performance">Performance</button>
    <button data-tab="errors">Errors</button>
  </nav>
</header>
<main>
  <section id="model" class="active">
    <h2>Cubes (live from /cubejs-api/v1/meta)</h2>
    <div id="model-meta" class="loading">Loading&hellip;</div>
    <h2>Schema source (raw, from the live schema/ mount)</h2>
    <div id="model-files" class="loading">Loading&hellip;</div>
  </section>
  <section id="preaggs">
    <div class="subnav">
      <button data-subtab="partitions" class="active">Partitions</button>
      <button data-subtab="history">Build history</button>
    </div>
    <div id="preaggs-partitions" class="subpanel active">
      <h2>Pre-aggregations &amp; partitions</h2>
      <div id="preagg-filter-host"></div>
      <div id="preagg-table-host" class="loading">Loading&hellip;</div>
    </div>
    <div id="preaggs-history" class="subpanel">
      <h2>Build history</h2>
      <div id="history-info-host"></div>
      <div class="controls-row">
        <div id="history-filter-host"></div>
        <div id="history-timerange-host"></div>
      </div>
      <div id="history-list-host" class="loading">Loading&hellip;</div>
    </div>
  </section>
  <section id="queries">
    <div class="controls-row">
      <div id="query-origin-host"></div>
      <div id="query-timerange-host"></div>
    </div>
    <h2>Query volume &amp; duration</h2>
    <div id="query-charts-host" class="loading">Loading&hellip;</div>
    <h2>Queries</h2>
    <div id="query-filter-host"></div>
    <div id="query-filter-summary-host"></div>
    <div id="query-table-host" class="loading">Loading&hellip;</div>
  </section>
  <section id="performance">
    <div class="controls-row">
      <div id="perf-origin-host"></div>
      <div id="perf-timerange-host"></div>
    </div>
    <h2>Cache &amp; pre-aggregation performance</h2>
    <div id="perf-charts-host" class="loading">Loading&hellip;</div>
    <h2>Request mix &amp; cache freshness</h2>
    <div id="perf-mix-charts-host" class="loading">Loading&hellip;</div>
    <h2>Data model compilation</h2>
    <div id="perf-compile-charts-host" class="loading">Loading&hellip;</div>
  </section>
  <section id="errors">
    <div id="errors-timerange-host"></div>
    <h2>Auth failures &amp; pre-aggregation build errors</h2>
    <div id="errors-chart-host" class="loading">Loading&hellip;</div>
    <h2>Recent errors</h2>
    <div id="errors-list-host" class="loading">Loading&hellip;</div>
  </section>
</main>

<div id="overlay-backdrop" class="overlay-backdrop" hidden>
  <div class="overlay-panel">
    <div class="overlay-header">
      <h3 id="overlay-title"></h3>
      <button id="overlay-close" class="close-btn" aria-label="Close">&times;</button>
    </div>
    <div id="overlay-body" class="overlay-body"></div>
  </div>
</div>

<!-- Charts (see the render*Chart functions below). Pinned exact version,
     loaded from a CDN: the one external dependency this otherwise fully
     self-contained, single-file frontend takes on -- requires the
     browser viewing the dashboard to reach jsdelivr, which is virtually
     always true even for an internal-network-only deployment. -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
<script>
async function getJSON(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
  return body;
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v; else node.setAttribute(k, v);
  }
  for (const c of children || []) node.append(c);
  return node;
}

function errBox(e) {
  return el('div', { class: 'err' }, [String(e.message || e)]);
}

// A small "?" that reveals longer explanatory text on hover/focus, for
// text that's genuinely useful but too long to justify sitting inline,
// permanently visible, every time. tabindex so keyboard users (:focus)
// can reach it too, not just mouse hover.
function helpTip(contentChildren) {
  const tip = el('span', { class: 'help-tip', tabindex: '0' }, ['?']);
  tip.append(el('span', { class: 'help-tip-content' }, contentChildren));
  return tip;
}

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

// Aggregate types (sum/count/avg/...) vs. Cube's own value types
// (string/number/time/boolean) get different pill colors so a cube's
// shape reads at a glance, same idea as the built/no-data pills below.
const AGG_TYPES = new Set(['sum', 'count', 'countDistinct', 'countDistinctApprox', 'avg', 'min', 'max', 'runningTotal']);
function typePill(type) {
  if (!type) return '';
  const cls = AGG_TYPES.has(type) ? 'type-agg' : ['string', 'number', 'time'].includes(type) ? 'type-' + type : 'type-other';
  return el('span', { class: 'pill ' + cls }, [type]);
}

// --- Smart per-column header filters, shared by the pre-aggregations and
// query history tables below ---
//
// Excel/Sheets-style AutoFilter: a small caret on a filterable header opens
// a checkbox list of the distinct values present in that column (a search
// box appears once there are more than a few, for columns with lots of
// distinct values). Checked values within one column OR together; filtered
// columns AND together. Each column's own list is computed against rows
// already matching every OTHER active column filter, not its own -- so
// unchecking a value never makes it vanish from its own list, matching
// standard AutoFilter behavior.
//
// A "columns" array here is a list of { key, label, filterValue?,
// formatValue? } -- filterValue's presence marks a column as filterable;
// formatValue (default identity) turns a raw value into its checkbox
// label. columnFilters is a plain object of key -> Set of selected raw
// values (empty Set = column not filtered). "ui" is a small per-table
// { openKey, search } object tracking which column's popover (if any) is
// open and what's typed into its search box.
//
// Every interaction -- opening/closing a popover, typing a search term,
// checking a box -- calls back into the table's own full render function
// rather than patching the DOM in place. That's deliberately the same
// pattern sort-on-click already uses elsewhere in this file, and it's what
// makes a popover reappear open after a checkbox click "just work": the
// render function reads ui.openKey/ui.search fresh every time, so there's
// no DOM state to preserve across the re-render.

const columnFilterRegistry = new Map(); // ui object -> that table's render function
function closeAnyOpenColumnFilter() {
  for (const [ui, rerender] of columnFilterRegistry) {
    if (ui.openKey !== null) { ui.openKey = null; rerender(); }
  }
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.col-filter-popover') || e.target.closest('.col-filter-btn')) return;
  closeAnyOpenColumnFilter();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAnyOpenColumnFilter(); });

function rowMatchesColumnFilters(row, columns, columnFilters) {
  for (const col of columns) {
    if (!col.filterValue) continue;
    const selected = columnFilters[col.key];
    if (selected && selected.size && !selected.has(col.filterValue(row))) return false;
  }
  return true;
}

function computeColumnValues(rows, columns, columnFilters, col) {
  const counts = new Map();
  for (const row of rows) {
    let matches = true;
    for (const other of columns) {
      if (!other.filterValue || other.key === col.key) continue;
      const selected = columnFilters[other.key];
      if (selected && selected.size && !selected.has(other.filterValue(row))) { matches = false; break; }
    }
    if (!matches) continue;
    const v = col.filterValue(row);
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
}

function anyColumnFilterActive(columnFilters) {
  return Object.values(columnFilters).some(s => s.size > 0);
}

// Renders a "Clear column filters" link into hostId, only while at least
// one column filter is active -- a way back out without having to open
// each popover and hit "None" individually.
function renderColumnFilterSummary(hostId, columnFilters, onClear) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = '';
  if (!anyColumnFilterActive(columnFilters)) return;
  const btn = el('button', { type: 'button', class: 'filter-clear-btn' }, ['Clear column filters']);
  btn.addEventListener('click', () => {
    Object.values(columnFilters).forEach(s => s.clear());
    onClear();
  });
  host.append(btn);
}

// Mutates "th" in place, appending the filter caret (and, if this column's
// popover is the one currently open per "ui", the popover itself). Callers
// build the rest of the <th> (label, sort click handler, ...) themselves;
// this only ever adds to it, so it composes with a sortable header (the
// pre-aggregations table) or a plain one (query history) the same way.
// Funnel icon (fill: currentColor, so .col-filter-btn's own color -- grey
// normally, green once active -- carries through without a second set of
// color rules to keep in sync).
const FILTER_ICON_SVG = '<svg viewBox="0 0 16 16" fill="currentColor"><polygon points="2,3 14,3 9.5,8.5 9.5,13 6.5,13 6.5,8.5"/></svg>';

function appendColumnFilterUI(th, col, allRows, columns, columnFilters, ui, onChange) {
  columnFilterRegistry.set(ui, onChange);
  th.classList.add('filterable-th');
  const selected = columnFilters[col.key];

  const btn = el('button', {
    type: 'button', class: 'col-filter-btn' + (selected.size ? ' active' : ''),
    title: selected.size ? ('Filtered (' + selected.size + ' selected)') : 'Filter',
  }, []);
  btn.innerHTML = FILTER_ICON_SVG;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    ui.openKey = ui.openKey === col.key ? null : col.key;
    ui.search = '';
    onChange();
  });
  th.append(btn);

  if (ui.openKey !== col.key) return;

  const formatValue = col.formatValue || ((v) => String(v));
  const values = computeColumnValues(allRows, columns, columnFilters, col);

  const pop = el('div', { class: 'col-filter-popover' });
  pop.addEventListener('click', (e) => e.stopPropagation());

  let searchInput = null;
  if (values.length > 8) {
    searchInput = el('input', { type: 'search', class: 'col-filter-search', placeholder: 'Search\\u2026' });
    searchInput.value = ui.search;
    searchInput.addEventListener('input', () => { ui.search = searchInput.value.trim().toLowerCase(); onChange(); });
    pop.append(searchInput);
  }

  const term = ui.search;
  const filtered = values.filter(v => !term || formatValue(v.value).toLowerCase().includes(term));
  const listHost = el('div', { class: 'col-filter-list' });
  if (!filtered.length) {
    listHost.append(el('div', { class: 'col-filter-empty' }, ['No matches']));
  } else {
    filtered.forEach(v => {
      const cb = el('input', { type: 'checkbox' }, []);
      cb.checked = selected.has(v.value);
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(v.value); else selected.delete(v.value);
        onChange();
      });
      listHost.append(el('label', { class: 'col-filter-item' }, [
        cb, el('span', null, [formatValue(v.value)]), el('span', { class: 'col-filter-count' }, [String(v.count)]),
      ]));
    });
  }
  pop.append(listHost);

  const actions = el('div', { class: 'col-filter-actions' });
  const allBtn = el('button', { type: 'button' }, ['All']);
  allBtn.addEventListener('click', () => { filtered.forEach(v => selected.add(v.value)); onChange(); });
  const noneBtn = el('button', { type: 'button' }, ['None']);
  noneBtn.addEventListener('click', () => { selected.clear(); onChange(); });
  actions.append(allBtn, noneBtn);
  pop.append(actions);

  th.append(pop);
  if (searchInput) {
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
}

// --- Sortable headers, shared by the same three array views ---
//
// One arrow indicator, one click target (the whole header), the same
// asc/desc toggle behavior everywhere: click a column to sort by it
// (a column's own "defaultDir" -- 'desc' for date-like columns where
// "most recent" is the useful first click, 'asc' otherwise -- decides
// which direction a first click on it lands in); click the same column
// again to reverse. "sortState" is mutated in place (never reassigned)
// so this can take any table's own { key, dir } object by reference.

function renderSortableHeaderCell(col, sortState, onChange) {
  const arrow = sortState.key === col.key ? (sortState.dir === 'asc' ? '\\u2191' : '\\u2193') : '';
  const th = el('th', { class: 'sortable-th' }, [col.label, ' ', el('span', { class: 'arrow' }, [arrow])]);
  th.addEventListener('click', () => {
    if (sortState.key === col.key) {
      sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.key = col.key;
      sortState.dir = col.defaultDir || 'asc';
    }
    onChange();
  });
  return th;
}

function sortRows(rows, columns, sortState) {
  const col = columns.find(c => c.key === sortState.key);
  if (!col || !col.sort) return rows;
  return rows.slice().sort((a, b) => {
    const av = col.sort(a), bv = col.sort(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortState.dir === 'asc' ? cmp : -cmp;
  });
}

// --- Data model tab ---

async function loadModelMeta() {
  const host = document.getElementById('model-meta');
  try {
    const data = await getJSON('/api/model/meta');
    host.innerHTML = '';
    for (const cube of data.cubes || []) {
      const block = el('div', { class: 'cube-block' }, [
        el('h3', null, [cube.name + ' ', el('span', { class: 'muted' }, [cube.title || ''])]),
      ]);
      const mTable = el('table', null, [
        el('tr', null, [el('th', null, ['Measure']), el('th', null, ['Type']), el('th', null, ['Title'])]),
        ...(cube.measures || []).map(m => el('tr', null, [
          el('td', null, [el('code', null, [m.name])]),
          el('td', null, [typePill(m.aggType || m.type)]),
          el('td', null, [m.title || '']),
        ])),
      ]);
      const dTable = el('table', null, [
        el('tr', null, [el('th', null, ['Dimension']), el('th', null, ['Type']), el('th', null, ['Title'])]),
        ...(cube.dimensions || []).map(d => el('tr', null, [
          el('td', null, [el('code', null, [d.name])]),
          el('td', null, [typePill(d.type)]),
          el('td', null, [d.title || '']),
        ])),
      ]);
      block.append(mTable, dTable);
      host.append(block);
    }
    if (!(data.cubes || []).length) host.append(el('div', { class: 'muted' }, ['No cubes returned.']));
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// Small hand-rolled highlighter (comments, strings, numbers, a handful of
// keywords) rather than pulling in an external library -- keeps this a
// single embedded file with no runtime dependency on a CDN being
// reachable. Escapes HTML first so the schema source can never inject
// markup; the highlighter then only ever wraps already-safe text in spans.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const JS_KEYWORDS = new Set(['const', 'let', 'var', 'function', 'return', 'true', 'false', 'null', 'undefined', 'new', 'typeof']);

function highlightJs(code) {
  const pattern = /(\\/\\/[^\\n]*)|(\`[^\`]*\`|'[^']*'|"[^"]*")|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[A-Za-z_$][A-Za-z0-9_$]*\\b)/g;
  return escapeHtml(code).replace(pattern, (m, comment, str, num, word) => {
    if (comment) return '<span class="tok-comment">' + comment + '</span>';
    if (str) return '<span class="tok-string">' + str + '</span>';
    if (num) return '<span class="tok-number">' + num + '</span>';
    if (word && JS_KEYWORDS.has(word)) return '<span class="tok-keyword">' + word + '</span>';
    return m;
  });
}

async function loadModelFiles() {
  const host = document.getElementById('model-files');
  try {
    const data = await getJSON('/api/model/files');
    host.innerHTML = '';
    for (const f of data.files || []) {
      host.append(el('h3', null, [f.name]));
      const pre = el('pre', null, []);
      pre.innerHTML = highlightJs(f.content);
      host.append(pre);
    }
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Pre-aggregations tab ---
//
// Field set + shapes confirmed live against the self-hosted deployment
// (POST /cubejs-system/v1/pre-aggregations/partitions with expand=
// partitions.details,meta,versions) -- see the plan's verification notes.
// The overlay's "Raw partition JSON" always has the full response, so
// nothing is silently lost if a future Cube version adds/renames fields.

const OVERLAY_FIELDS = [
  ['tableName', 'Table name'],
  ['dataSource', 'Data source'],
  ['type', 'Type'],
  ['granularity', 'Granularity'],
  ['partitionGranularity', 'Partition granularity'],
  ['buildRangeStart', 'Build range start'],
  ['buildRangeEnd', 'Build range end'],
  ['sealAt', 'Seal at'],
];

function lastUpdated(partition) {
  const entries = partition.versionEntries || [];
  const stamps = entries.map(v => v.last_updated_at).filter(Boolean);
  return stamps.length ? Math.max(...stamps) : null;
}

function shortTableName(name) {
  return (name || '').replace(/^prod_pre_aggregations\\./, '');
}

function renderVersionEntries(entries) {
  if (!entries || !entries.length) return el('div', { class: 'muted' }, ['No version entries -- not built yet.']);
  const rows = entries.map(v => el('tr', null, [
    el('td', null, [v.content_version || '']),
    el('td', null, [v.structure_version || '']),
    el('td', null, [fmtDate(v.last_updated_at)]),
  ]));
  return el('table', null, [
    el('tr', null, [el('th', null, ['Content version']), el('th', null, ['Structure version']), el('th', null, ['Last updated'])]),
    ...rows,
  ]);
}

function openOverlay(preAggId, partition) {
  const backdrop = document.getElementById('overlay-backdrop');
  document.getElementById('overlay-title').textContent = shortTableName(partition.tableName) || preAggId;

  const body = document.getElementById('overlay-body');
  body.innerHTML = '';

  const dl = el('dl', { class: 'field-grid' });
  dl.append(el('dt', null, ['Pre-aggregation']), el('dd', null, [preAggId]));
  for (const [key, label] of OVERLAY_FIELDS) {
    if (partition[key] === undefined) continue;
    const value = /Start|End|At$/.test(key) ? fmtDate(partition[key]) : String(partition[key]);
    dl.append(el('dt', null, [label]), el('dd', null, [value]));
  }
  body.append(dl);

  body.append(el('div', { class: 'muted' }, ['Build history:']));
  body.append(renderVersionEntries(partition.versionEntries));

  if (partition.invalidateKeyQueries) {
    const inv = el('details', null, [el('summary', null, ['Invalidation key queries'])]);
    inv.append(el('div', { class: 'detail-body' }, [el('pre', null, [JSON.stringify(partition.invalidateKeyQueries, null, 2)])]));
    body.append(inv);
  }

  const raw = el('details', null, [el('summary', null, ['Raw partition JSON'])]);
  raw.append(el('div', { class: 'detail-body' }, [el('pre', null, [JSON.stringify(partition, null, 2)])]));
  body.append(raw);

  backdrop.hidden = false;
}

function closeOverlay() {
  document.getElementById('overlay-backdrop').hidden = true;
}

document.getElementById('overlay-close').addEventListener('click', closeOverlay);
document.getElementById('overlay-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'overlay-backdrop') closeOverlay();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOverlay();
});

// A select (by pre-aggregation id) + free-text search (by table name),
// shared shape used on both the partitions table and the build history
// list. 'ids' populates the select's options; 'onChange' re-renders
// whatever's filtered whenever either control changes.
function renderFilterBar(hostId, ids, state, onChange) {
  const host = document.getElementById(hostId);
  host.innerHTML = '';
  const select = el('select', null, [
    el('option', { value: '' }, ['All pre-aggregations']),
    ...ids.map(id => el('option', { value: id }, [id])),
  ]);
  select.value = state.preAggId;
  select.addEventListener('change', () => { state.preAggId = select.value; onChange(); });

  const input = el('input', { type: 'search', placeholder: 'Search table name\\u2026' });
  input.value = state.search;
  input.addEventListener('input', () => { state.search = input.value.trim().toLowerCase(); onChange(); });

  host.append(el('div', { class: 'filter-bar' }, [select, input]));
}

function matchesFilter(preAggId, tableName, state) {
  if (state.preAggId && preAggId !== state.preAggId) return false;
  if (state.search && !(tableName || '').toLowerCase().includes(state.search)) return false;
  return true;
}

const COLUMNS = [
  { key: 'preAggId', label: 'Pre-aggregation', sort: (r) => r.preAggId, filterValue: (r) => r.preAggId },
  { key: 'tableName', label: 'Table name', sort: (r) => r.partition.tableName || '', filterValue: (r) => r.partition.tableName || '(none)' },
  { key: 'buildRangeStart', label: 'Build range', sort: (r) => r.partition.buildRangeStart || '', defaultDir: 'desc' },
  { key: 'sealAt', label: 'Seal at', sort: (r) => r.partition.sealAt || '', defaultDir: 'desc' },
  {
    key: 'lastUpdated', label: 'Last updated', sort: (r) => lastUpdated(r.partition) || 0, defaultDir: 'desc',
    filterValue: (r) => ((r.partition.versionEntries || []).length > 0 ? 'built' : 'empty'),
    formatValue: (v) => (v === 'built' ? 'built' : 'no data'),
  },
];

let preaggSortState = { key: 'lastUpdated', dir: 'desc' };
let preaggColumnFilters = { preAggId: new Set(), tableName: new Set(), lastUpdated: new Set() };
let preaggFilterUi = { openKey: null, search: '' };
let preaggAllRows = [];

function renderPreaggTable() {
  const host = document.getElementById('preagg-table-host');
  host.innerHTML = '';
  renderColumnFilterSummary('preagg-filter-host', preaggColumnFilters, renderPreaggTable);

  const rows = preaggAllRows.filter(r => rowMatchesColumnFilters(r, COLUMNS, preaggColumnFilters));

  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, [preaggAllRows.length ? 'No partitions match the current filters.' : 'No partitions found.']));
    return;
  }

  const sorted = sortRows(rows, COLUMNS, preaggSortState);

  const thead = el('tr', null, COLUMNS.map(col => {
    const th = renderSortableHeaderCell(col, preaggSortState, renderPreaggTable);
    if (col.filterValue) appendColumnFilterUI(th, col, preaggAllRows, COLUMNS, preaggColumnFilters, preaggFilterUi, renderPreaggTable);
    return th;
  }));

  const tbody = sorted.map(row => {
    const built = (row.partition.versionEntries || []).length > 0;
    const tr = el('tr', null, [
      el('td', null, [row.preAggId]),
      el('td', { class: 'mono' }, [shortTableName(row.partition.tableName)]),
      el('td', null, [fmtDate(row.partition.buildRangeStart)]),
      el('td', null, [fmtDate(row.partition.sealAt)]),
      el('td', null, [
        fmtDate(lastUpdated(row.partition)) || '\\u2014',
        el('span', { class: 'pill ' + (built ? 'built' : 'empty') }, [built ? 'built' : 'no data']),
      ]),
    ]);
    tr.addEventListener('click', () => openOverlay(row.preAggId, row.partition));
    return tr;
  });

  host.append(el('table', { id: 'preagg-table' }, [thead, ...tbody]));
}

async function loadPreAggregations() {
  const host = document.getElementById('preagg-table-host');
  try {
    const partitionsResp = await getJSON('/api/pre-aggregations/partitions');
    const rows = [];
    for (const group of (partitionsResp.preAggregationPartitions || [])) {
      const preAggId = (group.preAggregation && group.preAggregation.id) || 'unknown';
      if (group.errors && group.errors.length) continue;
      for (const partition of (group.partitions || [])) {
        rows.push({ preAggId, partition });
      }
    }
    preaggAllRows = rows;
    renderPreaggTable();
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Build history tab ---
//
// Only Cube Store's own system.tables retains old table generations (past
// rebuilds) for a partition, and only while it's still inside its
// refreshKey.updateWindow -- see shared/cubeStore.ts for the full
// reasoning. The refreshKey values themselves come straight off the
// compiled pre-aggregation config cube_api returns (not parsed out of the
// schema source), so they can't drift from what's actually configured.

function openGenerationsOverlay(preAggId, group) {
  const backdrop = document.getElementById('overlay-backdrop');
  document.getElementById('overlay-title').textContent = group.logicalName;

  const body = document.getElementById('overlay-body');
  body.innerHTML = '';

  const dl = el('dl', { class: 'field-grid' });
  dl.append(el('dt', null, ['Pre-aggregation']), el('dd', null, [preAggId]));
  dl.append(el('dt', null, ['Generations']), el('dd', null, [String(group.generations.length)]));
  body.append(dl);

  body.append(el('div', { class: 'muted' }, ['Table generations (newest first) -- each one is a separate physical table Cube Store built; older generations of the same partition disappear once it ages out of updateWindow:']));
  body.append(el('ul', { class: 'gen-list' }, group.generations.map(g => el('li', null, [
    el('span', null, [g.tableName]),
    el('span', { class: 'muted' }, [fmtDate(g.createdAt)]),
  ]))));

  backdrop.hidden = false;
}

// Sortable the same way as the other two array views (see
// renderSortableHeaderCell/sortRows) -- no header filters here, since
// preAggId/table-name filtering already exists as the top filter bar above
// (shared with the partitions tab via renderFilterBar/matchesFilter).
const HISTORY_COLUMNS = [
  { key: 'preAggId', label: 'Pre-aggregation', sort: (r) => r.preAggId },
  { key: 'logicalName', label: 'Partition', sort: (r) => r.group.logicalName || '' },
  { key: 'generations', label: 'Generations', sort: (r) => r.group.generations.length },
  {
    key: 'mostRecentBuild', label: 'Most recent build', defaultDir: 'desc',
    sort: (r) => (r.group.generations[0] ? r.group.generations[0].createdAt : ''),
  },
];

let historyFilterState = { preAggId: '', search: '' };
let historySortState = { key: 'mostRecentBuild', dir: 'desc' };
let historyAllGroups = []; // [{ preAggId, group }]

// Deliberately its own small preset row, not the shared queryTimeWindow
// query-history/performance/errors already key off -- rebuilds don't
// happen every hour the way real query traffic does, so inheriting
// whatever those tabs last had selected (often "Last 1h") would make an
// otherwise fully-populated build history look empty by default. Defaults
// to "All time" instead; narrowing it is opt-in.
const HISTORY_TIME_RANGES = [
  { label: 'All time', minutes: null },
  { label: '24h', minutes: 24 * 60 },
  { label: '7d', minutes: 7 * 24 * 60 },
  { label: '30d', minutes: 30 * 24 * 60 },
];
let historyTimeRangeMinutes = null;

function renderHistoryTimeRangeBar() {
  const host = document.getElementById('history-timerange-host');
  if (!host) return;
  host.innerHTML = '';
  const bar = el('div', { class: 'timerange-bar' });
  for (const range of HISTORY_TIME_RANGES) {
    const btn = el('button', {}, [range.minutes === null ? range.label : 'Last ' + range.label]);
    if (range.minutes === historyTimeRangeMinutes) btn.classList.add('active');
    btn.addEventListener('click', () => {
      historyTimeRangeMinutes = range.minutes;
      renderHistoryTimeRangeBar();
      renderHistoryList();
    });
    bar.append(btn);
  }
  host.append(bar);
}

// A row (a partition's whole generation history) matches the time filter
// if ANY of its generations was built in the window -- "what got rebuilt
// recently", not "is its most recent build recent" (a partition rebuilt
// yesterday and again an hour ago should still show up under "last 24h"
// either way, but this also surfaces one rebuilt only yesterday under a
// "last 24h" filter if it has an older generation that's since aged out
// -- vanishingly rare in practice since old generations disappear once
// they leave updateWindow, per openGenerationsOverlay's comment).
function matchesHistoryTimeRange(group) {
  if (historyTimeRangeMinutes === null) return true;
  const cutoff = Date.now() - historyTimeRangeMinutes * 60 * 1000;
  return group.generations.some(g => Date.parse(g.createdAt) >= cutoff);
}

function renderHistoryList() {
  const host = document.getElementById('history-list-host');
  host.innerHTML = '';

  const rows = historyAllGroups.filter(r => matchesFilter(r.preAggId, r.group.logicalName, historyFilterState) && matchesHistoryTimeRange(r.group));

  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, [historyAllGroups.length ? 'No partitions match the current filters.' : 'No history found.']));
    return;
  }

  const sorted = sortRows(rows, HISTORY_COLUMNS, historySortState);

  const thead = el('tr', null, HISTORY_COLUMNS.map(col => renderSortableHeaderCell(col, historySortState, renderHistoryList)));

  const tbody = sorted.map(row => {
    const latest = row.group.generations[0];
    const tr = el('tr', null, [
      el('td', null, [row.preAggId]),
      el('td', { class: 'mono' }, [shortTableName(row.group.logicalName)]),
      el('td', null, [
        String(row.group.generations.length),
        row.group.generations.length > 1 ? el('span', { class: 'pill built' }, ['rebuilt']) : '',
      ]),
      el('td', null, [latest ? fmtDate(latest.createdAt) : '\\u2014']),
    ]);
    tr.addEventListener('click', () => openGenerationsOverlay(row.preAggId, row.group));
    return tr;
  });

  host.append(el('table', null, [thead, ...tbody]));
}

async function loadBuildHistory() {
  const infoHost = document.getElementById('history-info-host');
  const listHost = document.getElementById('history-list-host');
  try {
    const data = await getJSON('/api/pre-aggregations/build-history');
    const preAggs = data.preAggregations || [];

    infoHost.innerHTML = '';
    for (const pa of preAggs) {
      const rk = pa.refreshKey || {};
      infoHost.append(el('div', { class: 'info-card' }, [
        el('strong', null, [pa.id]), ' \\u2014 refreshes every ',
        el('code', null, [rk.every || '?']),
        ', rebuilds partitions within the last ',
        el('code', null, [rk.updateWindow || '?']),
        ' (updateWindow).',
        helpTip([
          'To change updateWindow: edit refreshKey.updateWindow for this pre-aggregation in schema/*.js and redeploy. ',
          'It only affects which recent partitions keep getting incrementally rebuilt (and how long their build history stays visible here) \\u2014 ',
          'it does not rebuild anything retroactively, does not extend history for already-settled older partitions, and widening it means more freshness checks against the source DB.',
        ]),
      ]));
    }

    const rows = [];
    for (const pa of preAggs) {
      for (const group of (pa.partitions || [])) {
        rows.push({ preAggId: pa.id, group });
      }
    }
    historyAllGroups = rows;
    const ids = [...new Set(rows.map(r => r.preAggId))].sort();
    renderFilterBar('history-filter-host', ids, historyFilterState, renderHistoryList);
    renderHistoryList();
  } catch (e) {
    infoHost.innerHTML = '';
    listHost.innerHTML = '';
    listHost.append(errBox(e));
  }
}

// --- Query history tab ---
//
// Sourced from cube.js's custom logger (see cube.js and the plan) --
// captures 'Load Request Success' plus every error/pending completion
// type Cube emits, persisted server-side in dashboard/queryhistory/db.ts
// so it survives cube_api restarts, unlike the container logs it comes from.

// Same escape-first-then-tokenize approach as highlightJs, tuned for JSON
// instead of the schema's JS: keys, string values, numbers, booleans/null
// and punctuation each get their own pastel color. pretty=false renders a
// single compact line (table preview); pretty=true pretty-prints (overlay).
function highlightJson(jsonString, pretty) {
  let text;
  try {
    text = JSON.stringify(JSON.parse(jsonString), null, pretty ? 2 : 0);
  } catch (e) {
    text = jsonString || '';
  }
  const escaped = escapeHtml(text);
  const pattern = /("(?:\\\\.|[^"\\\\])*"(\\s*:)?)|(\\b(?:true|false)\\b)|(\\bnull\\b)|(-?\\d+(?:\\.\\d+)?)|([{}\\[\\],])/g;
  return escaped.replace(pattern, (m, str, isKey, bool, nul, num, punct) => {
    if (str) return '<span class="' + (isKey ? 'json-key' : 'json-string') + '">' + str + '</span>';
    if (bool) return '<span class="json-boolean">' + bool + '</span>';
    if (nul) return '<span class="json-null">' + nul + '</span>';
    if (num) return '<span class="json-number">' + num + '</span>';
    if (punct) return '<span class="json-punct">' + punct + '</span>';
    return m;
  });
}

function fmtMs(ms) {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

// --- Charts: Chart.js-backed (see the pinned CDN <script> tag above). One
// canvas per chart-card; before a card's host is torn down for a re-render,
// destroyChartsIn() looks up and destroys any existing Chart instance on
// its canvases via Chart.getChart() (Chart.js's own registry, keyed by
// canvas -- no need to track instances ourselves), so switching time
// ranges never leaks chart instances.

function destroyChartsIn(host) {
  host.querySelectorAll('canvas').forEach(c => {
    const existing = Chart.getChart(c);
    if (existing) existing.destroy();
  });
}

const CHART_FONT = { family: '-apple-system, system-ui, sans-serif', size: 11 };
const CHART_GRID_COLOR = '#1c1f24';
const CHART_TICK_COLOR = '#6b7280';

// Shared card+canvas scaffold. Renders the "No data yet" placeholder and
// returns null when there's nothing to plot, so callers can bail out with
// a single "if (!canvas) return".
function newChartCard(host, buckets, titleText) {
  const card = el('div', { class: 'chart-card' }, [el('h3', null, [titleText])]);
  host.append(card);
  if (!buckets.length) {
    card.append(el('div', { class: 'chart-empty' }, ['No data yet.']));
    return null;
  }
  const wrap = el('div', { class: 'chart-canvas-wrap' });
  const canvas = el('canvas', null, []);
  wrap.append(canvas);
  card.append(wrap);
  return canvas;
}

function chartLabels(buckets) {
  return buckets.map(b => new Date(b.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
}

// Tooltip title shows the full timestamp (the x-axis labels themselves are
// just hour:minute, ambiguous across a multi-day range) and, with
// interaction.mode 'index', every series at that bucket at once -- a real
// improvement over the old hand-rolled charts' one-title-per-element
// native tooltip, which only ever showed a single value. filter drops
// series with no data point in that bucket (renderMultiLineChart's gaps)
// rather than showing a confusing blank/null line.
function baseChartOptions(buckets, formatValue, opts) {
  opts = opts || {};
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: !!opts.legend,
        position: 'bottom',
        labels: { color: '#9aa4b2', font: CHART_FONT, boxWidth: 10, boxHeight: 10, padding: 12 },
      },
      tooltip: {
        backgroundColor: '#111318',
        borderColor: '#23262b',
        borderWidth: 1,
        padding: 10,
        titleFont: CHART_FONT,
        bodyFont: CHART_FONT,
        titleColor: '#e6e6e6',
        bodyColor: '#e6e6e6',
        filter: (item) => item.parsed.y !== null,
        callbacks: {
          title: (items) => (items.length ? fmtDate(buckets[items[0].dataIndex].bucket) : ''),
          label: (item) => (item.dataset.label ? item.dataset.label + ': ' : '') + formatValue(item.parsed.y),
        },
      },
    },
    scales: {
      x: {
        stacked: !!opts.stacked,
        grid: { display: false },
        ticks: { color: CHART_TICK_COLOR, font: CHART_FONT, maxRotation: 0, autoSkip: true },
      },
      y: {
        stacked: !!opts.stacked,
        beginAtZero: true,
        grid: { color: CHART_GRID_COLOR },
        ticks: { color: CHART_TICK_COLOR, font: CHART_FONT, callback: formatValue },
      },
    },
  };
}

// Chart.js's own categoryPercentage/maxBarThickness keep bars a sane fixed
// width instead of stretching to fill the card -- with only 1-2 buckets (a
// fresh deployment, or a quiet period) a full-width bar reads as a single
// solid block, indistinguishable from a plain rectangle.
function renderBarChart(host, buckets, valueFn, color, formatValue, titleText) {
  const canvas = newChartCard(host, buckets, titleText);
  if (!canvas) return;
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: chartLabels(buckets),
      datasets: [{ data: buckets.map(valueFn), backgroundColor: color, borderRadius: 2, maxBarThickness: 48, categoryPercentage: 0.6 }],
    },
    options: baseChartOptions(buckets, formatValue),
  });
}

// Same axes as renderBarChart, connected points instead of bars -- a more
// natural read for a continuously-varying value like average duration
// than discrete bars.
function renderLineChart(host, buckets, valueFn, color, formatValue, titleText) {
  const canvas = newChartCard(host, buckets, titleText);
  if (!canvas) return;
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartLabels(buckets),
      datasets: [{
        data: buckets.map(valueFn), borderColor: color, backgroundColor: color,
        pointRadius: 3, pointHoverRadius: 5, tension: 0.25, fill: false,
      }],
    },
    options: baseChartOptions(buckets, formatValue),
  });
}

// Cache-type series shared by the two multi-series charts below. Order
// matters: drawn/stacked bottom-to-top in this order, so the "best case"
// tiers (in-memory, then the persistent Cube-Store-backed cache) sit at the
// bottom of the stack and 'source' (the slow, no-cache path) on top --
// reads as "how much of this is the fast path" at a glance.
const CACHE_TYPE_ORDER = ['in-memory', 'cube-store-cache', 'pre-aggregation', 'source'];
const CACHE_TYPE_LABELS = {
  'in-memory': 'In-memory cache',
  'cube-store-cache': 'Cube Store cache',
  'pre-aggregation': 'Pre-aggregation',
  'source': 'Source (no cache)',
};
const CACHE_TYPE_COLORS = {
  'in-memory': '#86efac',
  'cube-store-cache': '#93c5fd',
  'pre-aggregation': '#7dd3fc',
  'source': '#fdba74',
};

// The API returns one row per (bucket, cacheType) pair -- pivot into one
// row per bucket timestamp, each cache type keyed on it, so the stacked/
// multi-line charts can walk a single ordered bucket list the same way the
// single-series charts above do.
function pivotCacheBuckets(rows) {
  const byBucket = new Map();
  for (const r of rows) {
    if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, { bucket: r.bucket });
    byBucket.get(r.bucket)[r.cacheType] = { count: r.count, avgDurationMs: r.avgDurationMs };
  }
  return [...byBucket.values()].sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
}

// Same fixed-bar-width approach as renderBarChart, stacking each bucket's
// series on top of each other instead of drawing a single value. The
// legend is interactive (Chart.js's default): click a series to isolate
// it, unlike the old hand-rolled legend which was decoration only.
function renderStackedBarChart(host, buckets, seriesKeys, colorMap, labelMap, titleText) {
  const canvas = newChartCard(host, buckets, titleText);
  if (!canvas) return;
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: chartLabels(buckets),
      datasets: seriesKeys.map(key => ({
        label: labelMap[key],
        data: buckets.map(b => (b[key] ? b[key].count : 0)),
        backgroundColor: colorMap[key],
        maxBarThickness: 48,
        categoryPercentage: 0.6,
      })),
    },
    options: baseChartOptions(buckets, (v) => String(v), { legend: true, stacked: true }),
  });
}

// Same axes as renderLineChart, one dataset per series. spanGaps: false
// (Chart.js's default, made explicit here) breaks each line across a
// bucket where that series had zero requests, rather than interpolating
// through it -- a straight line through the gap would imply a response
// time that was never actually observed.
function renderMultiLineChart(host, buckets, seriesKeys, colorMap, labelMap, formatValue, titleText) {
  const canvas = newChartCard(host, buckets, titleText);
  if (!canvas) return;
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartLabels(buckets),
      datasets: seriesKeys.map(key => ({
        label: labelMap[key],
        data: buckets.map(b => (b[key] ? b[key].avgDurationMs : null)),
        borderColor: colorMap[key],
        backgroundColor: colorMap[key],
        pointRadius: 2.5,
        pointHoverRadius: 5,
        tension: 0.25,
        fill: false,
        spanGaps: false,
      })),
    },
    options: baseChartOptions(buckets, formatValue, { legend: true }),
  });
}

// --- Time range selector (drives both the charts and the table below) ---
//
// Two shapes share one state object -- { mode: 'relative', minutes } for
// every preset button ("last N minutes/hours/days"), or { mode: 'absolute',
// from, to } (ISO strings) for the custom range picker. Exactly one is
// ever active; timeWindowQuery() is the one place that turns whichever it
// is into the query-string fragment every fetch call below appends.

const TIME_RANGES = [
  { label: '5m', minutes: 5 },
  { label: '1h', minutes: 60 },
  { label: '24h', minutes: 24 * 60 },
  { label: '7d', minutes: 7 * 24 * 60 },
];

// Not important enough for the always-visible row, but one click away
// inside the custom-range popover -- the two gaps trimming TIME_RANGES
// left (15m, 6h), plus two longer look-backs that actually reach into
// what QUERY_HISTORY_RETENTION_DAYS (30 by default) keeps -- nothing in
// the main row reached past 7d before.
const EXTRA_TIME_RANGES = [
  { label: '15m', minutes: 15 },
  { label: '6h', minutes: 6 * 60 },
  { label: '14d', minutes: 14 * 24 * 60 },
  { label: '30d', minutes: 30 * 24 * 60 },
];

function loadStoredTimeWindow() {
  try {
    const stored = JSON.parse(localStorage.getItem('qh-timewindow') || 'null');
    if (stored && stored.mode === 'relative' && typeof stored.minutes === 'number') return stored;
    if (stored && stored.mode === 'absolute' && stored.from && stored.to) return stored;
  } catch (e) { /* malformed/unavailable storage -- fall through to default */ }
  return { mode: 'relative', minutes: 60 };
}

function saveTimeWindow(window) {
  try { localStorage.setItem('qh-timewindow', JSON.stringify(window)); } catch (e) { /* ignore */ }
}

let queryTimeWindow = loadStoredTimeWindow();

function timeWindowQuery() {
  return queryTimeWindow.mode === 'absolute'
    ? 'from=' + encodeURIComponent(queryTimeWindow.from) + '&to=' + encodeURIComponent(queryTimeWindow.to)
    : 'sinceMinutes=' + queryTimeWindow.minutes;
}

function applyTimeWindowToParams(params) {
  if (queryTimeWindow.mode === 'absolute') {
    params.set('from', queryTimeWindow.from);
    params.set('to', queryTimeWindow.to);
  } else {
    params.set('sinceMinutes', String(queryTimeWindow.minutes));
  }
}

function currentRangeLabel() {
  if (queryTimeWindow.mode === 'absolute') {
    return fmtDate(queryTimeWindow.from) + ' \\u2013 ' + fmtDate(queryTimeWindow.to);
  }
  const match = TIME_RANGES.concat(EXTRA_TIME_RANGES).find(r => r.minutes === queryTimeWindow.minutes);
  return match ? match.label : (queryTimeWindow.minutes + 'm');
}

// Shared across tabs (query history, performance, and errors all key off
// the same queryTimeWindow): each renders its own bar into its own host,
// but a click on any of them re-renders every bar and re-fires every
// registered loader, rather than each tab keeping an independent range.
const TIME_RANGE_BAR_HOSTS = ['query-timerange-host', 'perf-timerange-host', 'errors-timerange-host'];
const TIME_RANGE_LISTENERS = [];

function onTimeRangeChange(fn) {
  TIME_RANGE_LISTENERS.push(fn);
}

// Only one custom-range popover is ever meaningfully visible at a time
// (the three bars live in three different tab sections, only one of
// which is ever displayed), so a single shared open/closed flag is
// enough -- no need to track which host's button triggered it.
let customRangeUi = { open: false };

function applyTimeWindow(window) {
  queryTimeWindow = window;
  saveTimeWindow(window);
  customRangeUi.open = false;
  TIME_RANGE_BAR_HOSTS.forEach(renderTimeRangeBar);
  TIME_RANGE_LISTENERS.forEach(fn => fn());
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.timerange-popover') || e.target.closest('.timerange-custom-btn')) return;
  if (!customRangeUi.open) return;
  customRangeUi.open = false;
  TIME_RANGE_BAR_HOSTS.forEach(renderTimeRangeBar);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !customRangeUi.open) return;
  customRangeUi.open = false;
  TIME_RANGE_BAR_HOSTS.forEach(renderTimeRangeBar);
});

// Local (not UTC) "YYYY-MM-DDTHH:mm" -- what <input type="datetime-local">
// both reads and writes, so a previously-applied absolute window round-
// trips back into the fields showing exactly what was picked, in the
// viewer's own timezone rather than UTC.
function toDatetimeLocalValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function renderTimeRangeBar(hostId) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = '';
  const bar = el('div', { class: 'timerange-bar' });

  for (const range of TIME_RANGES) {
    const btn = el('button', {}, ['Last ' + range.label]);
    if (queryTimeWindow.mode === 'relative' && range.minutes === queryTimeWindow.minutes) btn.classList.add('active');
    btn.addEventListener('click', () => applyTimeWindow({ mode: 'relative', minutes: range.minutes }));
    bar.append(btn);
  }

  // Highlighted (and, for an extra preset specifically, relabeled to show
  // which one) whenever the active window isn't one of the main-row
  // buttons above -- otherwise picking "15m" from the popover would leave
  // no visible indication anywhere in the collapsed bar of what's active.
  const isMainPreset = queryTimeWindow.mode === 'relative' && TIME_RANGES.some(r => r.minutes === queryTimeWindow.minutes);
  const customBtn = el('button', { class: 'timerange-custom-btn' }, [isMainPreset ? 'Custom\\u2026' : (queryTimeWindow.mode === 'relative' ? currentRangeLabel() : 'Custom\\u2026')]);
  if (!isMainPreset) customBtn.classList.add('active');
  customBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    customRangeUi.open = !customRangeUi.open;
    TIME_RANGE_BAR_HOSTS.forEach(renderTimeRangeBar);
  });
  bar.append(customBtn);

  if (customRangeUi.open) {
    const pop = el('div', { class: 'timerange-popover' });
    // Nothing inside the popover should ever reach the outside-click
    // listener above, or a click on a preset/Apply button would
    // immediately be treated as "clicked outside" and close it again.
    pop.addEventListener('click', (e) => e.stopPropagation());

    pop.append(el('div', { class: 'timerange-popover-label' }, ['More presets']));
    const extraRow = el('div', { class: 'timerange-extra-presets' });
    for (const range of EXTRA_TIME_RANGES) {
      const btn = el('button', {}, [range.label]);
      if (queryTimeWindow.mode === 'relative' && range.minutes === queryTimeWindow.minutes) btn.classList.add('active');
      btn.addEventListener('click', () => applyTimeWindow({ mode: 'relative', minutes: range.minutes }));
      extraRow.append(btn);
    }
    pop.append(extraRow);

    pop.append(el('div', { class: 'timerange-popover-label' }, ['Custom range']));
    const defaultFrom = queryTimeWindow.mode === 'absolute' ? queryTimeWindow.from : new Date(Date.now() - 3_600_000).toISOString();
    const defaultTo = queryTimeWindow.mode === 'absolute' ? queryTimeWindow.to : new Date().toISOString();
    const fromInput = el('input', { type: 'datetime-local' });
    fromInput.value = toDatetimeLocalValue(defaultFrom);
    const toInput = el('input', { type: 'datetime-local' });
    toInput.value = toDatetimeLocalValue(defaultTo);
    pop.append(el('div', { class: 'timerange-custom-fields' }, [
      el('label', null, ['From', fromInput]),
      el('label', null, ['To', toInput]),
    ]));

    const errorHost = el('div', { class: 'timerange-popover-error' }, []);
    pop.append(errorHost);

    const applyBtn = el('button', { type: 'button', class: 'timerange-popover-apply' }, ['Apply']);
    applyBtn.addEventListener('click', () => {
      const fromMs = fromInput.value ? new Date(fromInput.value).getTime() : NaN;
      const toMs = toInput.value ? new Date(toInput.value).getTime() : NaN;
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
        errorHost.textContent = 'Pick both a start and an end.';
        return;
      }
      if (toMs <= fromMs) {
        errorHost.textContent = '"To" must be after "From".';
        return;
      }
      applyTimeWindow({ mode: 'absolute', from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() });
    });
    pop.append(applyBtn);

    bar.append(pop);
  }

  host.append(bar);
}

// --- Origin toggle: "user" (real end-user traffic, the default) vs
// "internal" (Cube's own scheduler/refreshKey-check activity) vs "all" --
// see originClause's comment in dashboard/queryhistory/db.ts for why this
// distinction exists at all: scheduler activity is indistinguishable from
// real traffic at a glance and, left mixed in, silently drags duration/
// count aggregates toward its own ~5000ms polling interval. Shared across
// the two tabs whose charts read from query_events (query history's own
// charts, and performance's cache-type/request-mix charts) the same way
// TIME_RANGE_BAR_HOSTS is -- the Errors tab isn't included since it reads
// from an entirely different table.

const QUERY_ORIGINS = [
  { value: 'user', label: 'User' },
  { value: 'internal', label: 'Internal (scheduler)' },
  { value: 'all', label: 'All' },
];

function loadStoredQueryOrigin() {
  try {
    const stored = localStorage.getItem('qh-query-origin');
    if (QUERY_ORIGINS.some(o => o.value === stored)) return stored;
  } catch (e) { /* ignore */ }
  return 'user';
}

let queryOriginState = loadStoredQueryOrigin();
const ORIGIN_BAR_HOSTS = ['query-origin-host', 'perf-origin-host'];
const ORIGIN_LISTENERS = [];

function onOriginChange(fn) {
  ORIGIN_LISTENERS.push(fn);
}

function renderOriginBar(hostId) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = '';
  const bar = el('div', { class: 'timerange-bar' });
  for (const origin of QUERY_ORIGINS) {
    const btn = el('button', {}, [origin.label]);
    if (origin.value === queryOriginState) btn.classList.add('active');
    btn.addEventListener('click', () => {
      queryOriginState = origin.value;
      try { localStorage.setItem('qh-query-origin', origin.value); } catch (e) { /* ignore */ }
      ORIGIN_BAR_HOSTS.forEach(renderOriginBar);
      ORIGIN_LISTENERS.forEach(fn => fn());
    });
    bar.append(btn);
  }
  host.append(bar);
}

async function loadQueryCharts() {
  const host = document.getElementById('query-charts-host');
  try {
    const data = await getJSON('/api/query-history/stats?' + timeWindowQuery() + '&origin=' + queryOriginState);
    const buckets = data.buckets || [];
    destroyChartsIn(host);
    host.innerHTML = '';
    const row = el('div', { class: 'charts-row' });
    host.append(row);
    renderBarChart(row, buckets, b => b.count, '#93c5fd', v => String(v) + ' queries', 'Query count (last ' + currentRangeLabel() + ')');
    renderLineChart(row, buckets, b => b.avgDurationMs || 0, '#f9a8d4', v => fmtMs(Math.round(v)), 'Avg duration (last ' + currentRangeLabel() + ')');
  } catch (e) {
    destroyChartsIn(host);
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Performance tab: cache-type breakdown + data model compilation ---
//
// Only these four metrics -- see the plan: the other four (Cube Store
// worker saturation/wait time for queries and jobs) have no OSS signal at
// all, confirmed by reading the pinned image's source and cubestored
// binary directly, so they're not implemented rather than faked.

async function loadPerformanceCharts() {
  const cacheHost = document.getElementById('perf-charts-host');
  const compileHost = document.getElementById('perf-compile-charts-host');
  try {
    const [cacheData, compileData] = await Promise.all([
      getJSON('/api/query-history/cache-stats?' + timeWindowQuery() + '&origin=' + queryOriginState),
      getJSON('/api/performance/compile-stats?' + timeWindowQuery()),
    ]);

    const cacheBuckets = pivotCacheBuckets(cacheData.buckets || []);
    destroyChartsIn(cacheHost);
    cacheHost.innerHTML = '';
    const cacheRow = el('div', { class: 'charts-row' });
    cacheHost.append(cacheRow);
    renderStackedBarChart(cacheRow, cacheBuckets, CACHE_TYPE_ORDER, CACHE_TYPE_COLORS, CACHE_TYPE_LABELS, 'Requests by cache type (last ' + currentRangeLabel() + ')');
    renderMultiLineChart(cacheRow, cacheBuckets, CACHE_TYPE_ORDER, CACHE_TYPE_COLORS, CACHE_TYPE_LABELS, v => fmtMs(Math.round(v)), 'Avg response time by cache type (last ' + currentRangeLabel() + ')');

    const compileBuckets = compileData.buckets || [];
    destroyChartsIn(compileHost);
    compileHost.innerHTML = '';
    const compileRow = el('div', { class: 'charts-row' });
    compileHost.append(compileRow);
    renderBarChart(compileRow, compileBuckets, b => b.count, '#c4b5fd', v => String(v) + ' compiles', 'Data model compilations (last ' + currentRangeLabel() + ')');
    renderLineChart(compileRow, compileBuckets, b => b.avgDurationMs || 0, '#fdba74', v => fmtMs(Math.round(v)), 'Wait time for data model compilation (last ' + currentRangeLabel() + ')');

    const totalCompiles = compileBuckets.reduce((s, b) => s + b.count, 0);
    const totalErrors = compileBuckets.reduce((s, b) => s + (b.errorCount || 0), 0);
    compileHost.append(el('div', { class: 'compile-note' }, [
      totalCompiles
        ? (totalCompiles + ' schema compilation' + (totalCompiles === 1 ? '' : 's') + ' in this window' +
           (totalErrors ? ' (' + totalErrors + ' failed)' : '') +
           ' -- compilers are cached after the first one, so this only fires again on a schema-version change (redeploy) or a slow renew.')
        : 'No schema compilations in this window -- expected for a stable deployment: compilers stay cached until the schema version changes.',
    ]));
  } catch (e) {
    destroyChartsIn(cacheHost);
    cacheHost.innerHTML = '';
    cacheHost.append(errBox(e));
    destroyChartsIn(compileHost);
    compileHost.innerHTML = '';
  }
}

// Unlike CACHE_TYPE_ORDER (a fixed, known-in-advance set of tiers), API
// types aren't enumerated anywhere in this project -- derived from
// whatever the data actually contains, sorted for a stable legend order.
// Known values get a fixed color; anything unrecognized still renders
// (grey) rather than silently vanishing from the chart.
const API_TYPE_COLORS = { rest: '#93c5fd', sql: '#86efac', graphql: '#c4b5fd', ws: '#fdba74' };
const API_TYPE_FALLBACK_COLOR = '#9aa4b2';

function pivotApiTypeBuckets(rows) {
  const byBucket = new Map();
  for (const r of rows) {
    if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, { bucket: r.bucket });
    byBucket.get(r.bucket)[r.apiType] = { count: r.count };
  }
  return [...byBucket.values()].sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
}

async function loadPerformanceMixCharts() {
  const host = document.getElementById('perf-mix-charts-host');
  try {
    const [apiTypeData, staleData] = await Promise.all([
      getJSON('/api/query-history/api-type-stats?' + timeWindowQuery() + '&origin=' + queryOriginState),
      getJSON('/api/query-history/stale-cache-stats?' + timeWindowQuery() + '&origin=' + queryOriginState),
    ]);

    const apiTypeBuckets = pivotApiTypeBuckets(apiTypeData.buckets || []);
    const apiTypeKeys = [...new Set((apiTypeData.buckets || []).map(r => r.apiType))].sort();
    const apiTypeColors = {}, apiTypeLabels = {};
    for (const k of apiTypeKeys) { apiTypeColors[k] = API_TYPE_COLORS[k] || API_TYPE_FALLBACK_COLOR; apiTypeLabels[k] = k; }

    const staleBuckets = staleData.buckets || [];

    destroyChartsIn(host);
    host.innerHTML = '';
    const row = el('div', { class: 'charts-row' });
    host.append(row);
    renderStackedBarChart(row, apiTypeBuckets, apiTypeKeys, apiTypeColors, apiTypeLabels, 'Requests by API type (last ' + currentRangeLabel() + ')');
    renderLineChart(
      row, staleBuckets,
      b => (b.total > 0 ? (b.staleCount / b.total) * 100 : 0),
      '#fde68a',
      v => v.toFixed(1) + '%',
      'Stale-cache-served rate (last ' + currentRangeLabel() + ')'
    );
  } catch (e) {
    destroyChartsIn(host);
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Errors tab: auth failures + pre-aggregation build job errors ---
//
// Structurally distinct from the query_events-backed charts on the
// Performance tab: neither event is tied to a completed, duration-bearing
// request (an auth failure happens before a security context exists at
// all; a build job error comes from a background refresh-worker job, not
// a live HTTP request) -- but charted the same bucketed-count way as
// everything else in this app. See cube.js for why auth failures can't be
// matched by a fixed message string, and why the raw bearer token is
// never forwarded here.

const ERROR_KIND_ORDER = ['auth', 'preagg-build'];
const ERROR_KIND_LABELS = { 'auth': 'Auth failures', 'preagg-build': 'Pre-agg build errors' };
const ERROR_KIND_COLORS = { 'auth': '#f9a8d4', 'preagg-build': '#fdba74' };

function pivotErrorBuckets(rows) {
  const byBucket = new Map();
  for (const r of rows) {
    if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, { bucket: r.bucket });
    byBucket.get(r.bucket)[r.kind] = { count: r.count };
  }
  return [...byBucket.values()].sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
}

async function loadErrorCharts() {
  const host = document.getElementById('errors-chart-host');
  try {
    const data = await getJSON('/api/performance/error-stats?' + timeWindowQuery());
    const buckets = pivotErrorBuckets(data.buckets || []);
    destroyChartsIn(host);
    host.innerHTML = '';
    const row = el('div', { class: 'charts-row' });
    host.append(row);
    renderStackedBarChart(row, buckets, ERROR_KIND_ORDER, ERROR_KIND_COLORS, ERROR_KIND_LABELS, 'Auth failures & pre-agg build errors (last ' + currentRangeLabel() + ')');
  } catch (e) {
    destroyChartsIn(host);
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// The chart above only ever shows a count -- this is the detail behind it:
// what actually failed, for which request, with what message.
const ERROR_KIND_LABELS_FULL = { 'auth': 'Auth failure', 'preagg-build': 'Pre-agg build error', 'compile': 'Compile error' };

function renderErrorsList(rows) {
  const host = document.getElementById('errors-list-host');
  host.innerHTML = '';
  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, ['No errors in this range.']));
    return;
  }
  const thead = el('tr', null, [
    el('th', null, ['Time']),
    el('th', null, ['Kind']),
    el('th', null, ['Type']),
    el('th', null, ['Request']),
    el('th', null, ['Message']),
  ]);
  const tbody = rows.map(row => {
    const kindCls = 'kind-' + row.kind;
    const message = row.errorMessage || (row.context ? row.context : '');
    return el('tr', null, [
      el('td', null, [fmtDate(row.occurredAt)]),
      el('td', null, [el('span', { class: 'pill ' + kindCls }, [ERROR_KIND_LABELS_FULL[row.kind] || row.kind])]),
      el('td', null, [row.type || '']),
      el('td', null, [row.requestId || '']),
      el('td', null, [el('span', { class: 'error-message' }, [message])]),
    ]);
  });
  host.append(el('table', null, [thead, ...tbody]));
}

async function loadRecentErrors() {
  const host = document.getElementById('errors-list-host');
  try {
    const data = await getJSON('/api/performance/recent-errors?' + timeWindowQuery());
    renderErrorsList(data.errors || []);
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Query table, filter, overlay ---

// Status/source/API type are all filterable straight from their column
// headers now (see appendColumnFilterUI) -- this bar keeps only the free-
// text search, which still needs a server round-trip (it matches against
// the full query_json of every stored row, not just the 200 already
// loaded for the current time range) so it can't become a client-side
// column filter the way the other three did.
let queryFilterState = { search: '' };
let queryFilterDebounce;

function renderQueryFilterBar() {
  const host = document.getElementById('query-filter-host');
  host.innerHTML = '';
  const input = el('input', { type: 'search', placeholder: 'Search query\\u2026' });
  input.value = queryFilterState.search;
  input.addEventListener('input', () => {
    queryFilterState.search = input.value.trim();
    clearTimeout(queryFilterDebounce);
    queryFilterDebounce = setTimeout(loadQueryTable, 300);
  });
  host.append(el('div', { class: 'filter-bar' }, [input]));
}

// usedPreAggregation: 1 = resolved from a rollup already in Cube Store
// (fast path), 0 = hit the source database directly, null = unknown (the
// query never got far enough to tell -- most error types).
function sourceKey(row) {
  if (row.usedPreAggregation === 1) return 'preagg';
  if (row.usedPreAggregation === 0) return 'scan';
  return 'unknown';
}
const SOURCE_LABELS = { preagg: 'pre-aggregation', scan: 'source scan', unknown: 'unknown' };

// servedStaleCache is a separate, orthogonal signal: Cube served an
// already-cached result because the freshness recheck was too slow to
// wait on -- can happen either way, so it's a second badge, not an
// alternative to the Source pill above.
function sourcePill(row) {
  const pills = [el('span', { class: 'pill source-' + sourceKey(row) }, [SOURCE_LABELS[sourceKey(row)]])];
  if (row.servedStaleCache) {
    pills.push(el('span', { class: 'pill cache-stale' }, ['stale cache']));
  }
  return pills;
}

// cacheType is the finer-grained signal behind the Source pill above: which
// tier actually served the response, not just whether a rollup existed --
// see the long comment on takeCacheTier in dashboard/queryhistory/db.ts.
// Reuses CACHE_TYPE_LABELS, the same map the aggregate chart above legends
// with, so the per-query label always matches the chart's wording.
function cachePill(row) {
  const cls = 'cachetype-' + (row.cacheType || 'unknown');
  return el('span', { class: 'pill ' + cls }, [CACHE_TYPE_LABELS[row.cacheType] || 'unknown']);
}

function statTile(label, valueNode) {
  return el('div', { class: 'stat-tile' }, [
    el('div', { class: 'stat-label' }, [label]),
    el('div', { class: 'stat-value' }, Array.isArray(valueNode) ? valueNode : [valueNode]),
  ]);
}

// Parses the JSON array db.ts stores (see PreAggregationUsed in
// dashboard/queryhistory/db.ts) -- [] means "resolved, hit source
// directly" (a real answer), not "not captured"; only a genuinely absent
// field means unknown.
function parsePreAggregationsUsed(row) {
  if (!row.preAggregationsJson) return [];
  try {
    return JSON.parse(row.preAggregationsJson);
  } catch (e) {
    return [];
  }
}

function openQueryOverlay(row) {
  document.getElementById('overlay-title').textContent = row.requestId || ('Query #' + row.id);
  const body = document.getElementById('overlay-body');
  body.innerHTML = '';

  // --- Key metrics, up top and prominent (not buried in the field list
  // below) -- the things you'd actually glance at first. ---
  body.append(el('div', { class: 'stat-tiles' }, [
    statTile('Status', el('span', { class: 'pill status-' + row.status }, [row.status])),
    statTile('Duration', fmtMs(row.durationMs)),
    statTile('Source', sourcePill(row)),
    statTile('Cache', cachePill(row)),
    statTile('Started at', fmtDate(row.startedAt)),
  ]));

  // --- Sub-tabs: everything else, grouped rather than one long scroll. ---
  const tabDefs = [
    ['overview', 'Overview'],
    ['preaggs', 'Pre-aggregations'],
    ['security', 'Security context'],
  ];
  const panels = {};
  const subnav = el('div', { class: 'overlay-subnav' });
  tabDefs.forEach(([key, label], i) => {
    const btn = el('button', {}, [label]);
    if (i === 0) btn.classList.add('active');
    btn.addEventListener('click', () => {
      subnav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.entries(panels).forEach(([k, p]) => p.classList.toggle('active', k === key));
    });
    subnav.append(btn);
  });
  body.append(subnav);

  // Overview: the rest of the identifying fields, error (if any), full query.
  const overviewPanel = el('div', { class: 'overlay-subpanel active' });
  const dl = el('dl', { class: 'field-grid' });
  const fields = [
    ['Type', row.type],
    ['Completed at', fmtDate(row.completedAt)],
    ['API type', row.apiType || ''],
    ['Organisation ID', row.organisationId || ''],
    ['User ID', row.userId || ''],
    ['Request ID', row.requestId || ''],
  ];
  for (const [label, value] of fields) {
    if (!value) continue;
    dl.append(el('dt', null, [label]), el('dd', null, [String(value)]));
  }
  overviewPanel.append(dl);
  if (row.errorMessage) {
    overviewPanel.append(el('div', { class: 'muted' }, ['Error:']));
    overviewPanel.append(el('pre', null, [row.errorMessage]));
  }
  overviewPanel.append(el('div', { class: 'muted' }, ['Query:']));
  const queryPre = el('pre', null, []);
  queryPre.innerHTML = highlightJson(row.queryJson || '{}', true);
  overviewPanel.append(queryPre);
  panels.overview = overviewPanel;
  body.append(overviewPanel);

  // Pre-aggregations: which rollup(s), if any, actually served this query --
  // distinct from the Source pill above, which only says yes/no.
  const preaggPanel = el('div', { class: 'overlay-subpanel' });
  const preaggList = parsePreAggregationsUsed(row);
  if (row.usedPreAggregation === null) {
    preaggPanel.append(el('div', { class: 'muted' }, ['Unknown \\u2014 this query never resolved far enough to tell (most error types).']));
  } else if (!preaggList.length) {
    preaggPanel.append(el('div', { class: 'muted' }, ['None \\u2014 this query hit the source database directly.']));
  } else {
    preaggPanel.append(el('table', null, [
      el('tr', null, [el('th', null, ['Pre-aggregation']), el('th', null, ['Table'])]),
      ...preaggList.map(p => el('tr', null, [
        el('td', null, [p.id || '']),
        el('td', { class: 'mono' }, [shortTableName(p.tableName || '')]),
      ])),
    ]));
  }
  panels.preaggs = preaggPanel;
  body.append(preaggPanel);

  // Security context: the full JWT claims cube.js's queryRewrite saw for
  // this request, not just the org/user id already pulled out above.
  const securityPanel = el('div', { class: 'overlay-subpanel' });
  if (row.securityContextJson) {
    const secPre = el('pre', null, []);
    secPre.innerHTML = highlightJson(row.securityContextJson, true);
    securityPanel.append(secPre);
  } else {
    securityPanel.append(el('div', { class: 'muted' }, ['Not captured for this query.']));
  }
  panels.security = securityPanel;
  body.append(securityPanel);

  document.getElementById('overlay-backdrop').hidden = false;
}

// Status/Source/API type get header filters (client-side, over whatever's
// already loaded for the current time range + search); Started at/Duration/
// Query preview don't -- a date range and a numeric range aren't a checkbox
// list, and Query preview is free text the search box above already covers
// server-side.
const QUERY_COLUMNS = [
  { key: 'status', label: 'Status', filterValue: (r) => r.status, sort: (r) => r.status },
  { key: 'startedAt', label: 'Started at', sort: (r) => r.startedAt || '', defaultDir: 'desc' },
  { key: 'durationMs', label: 'Duration', sort: (r) => r.durationMs || 0, defaultDir: 'desc' },
  { key: 'source', label: 'Source', filterValue: (r) => sourceKey(r), formatValue: (v) => SOURCE_LABELS[v], sort: (r) => sourceKey(r) },
  { key: 'apiType', label: 'API type', filterValue: (r) => r.apiType || '(none)', sort: (r) => r.apiType || '' },
  { key: 'queryJson', label: 'Query preview', sort: (r) => r.queryJson || '' },
];

// Default sort matches what the server already returns rows in
// (completed_at DESC) -- so with no explicit sort applied, the table looks
// exactly like it always has.
let querySortState = { key: 'startedAt', dir: 'desc' };
let queryColumnFilters = { status: new Set(), source: new Set(), apiType: new Set() };
let queryFilterUi = { openKey: null, search: '' };
let queryAllRows = [];

function renderQueryTable(rows) {
  queryAllRows = rows;
  renderQueryTableFiltered();
}

function renderQueryTableFiltered() {
  const host = document.getElementById('query-table-host');
  host.innerHTML = '';
  renderColumnFilterSummary('query-filter-summary-host', queryColumnFilters, renderQueryTableFiltered);

  if (!queryAllRows.length) {
    host.append(el('div', { class: 'muted' }, ['No queries recorded yet.']));
    return;
  }
  const filtered = queryAllRows.filter(r => rowMatchesColumnFilters(r, QUERY_COLUMNS, queryColumnFilters));
  if (!filtered.length) {
    host.append(el('div', { class: 'muted' }, ['No queries match the current filters.']));
    return;
  }
  const rows = sortRows(filtered, QUERY_COLUMNS, querySortState);

  const thead = el('tr', null, QUERY_COLUMNS.map(col => {
    const th = renderSortableHeaderCell(col, querySortState, renderQueryTableFiltered);
    if (col.filterValue) appendColumnFilterUI(th, col, queryAllRows, QUERY_COLUMNS, queryColumnFilters, queryFilterUi, renderQueryTableFiltered);
    return th;
  }));
  const tbody = rows.map(row => {
    const preview = el('code', { class: 'query-preview' }, []);
    preview.innerHTML = highlightJson(row.queryJson || '{}', false);
    const tr = el('tr', null, [
      el('td', null, [el('span', { class: 'pill status-' + row.status }, [row.status])]),
      el('td', null, [fmtDate(row.startedAt)]),
      el('td', null, [fmtMs(row.durationMs)]),
      el('td', null, sourcePill(row)),
      el('td', null, [row.apiType || '']),
      el('td', null, [preview]),
    ]);
    tr.addEventListener('click', () => openQueryOverlay(row));
    return tr;
  });
  host.append(el('table', null, [thead, ...tbody]));
}

async function loadQueryTable() {
  const host = document.getElementById('query-table-host');
  try {
    const params = new URLSearchParams();
    if (queryFilterState.search) params.set('search', queryFilterState.search);
    applyTimeWindowToParams(params);
    params.set('origin', queryOriginState);
    params.set('limit', '200');
    const data = await getJSON('/api/query-history?' + params.toString());
    renderQueryTable(data.rows || []);
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Tabs ---
//
// Active tab/sub-tab persisted in localStorage so a page refresh lands
// back where you were, instead of always resetting to Data model -- the
// HTML's baked-in 'active' classes are just the pre-load fallback, applied
// before any localStorage read is possible.

function activateTab(tabName) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('main section').forEach(s => s.classList.toggle('active', s.id === tabName));
}

function activateSubtab(subtabName) {
  document.querySelectorAll('.subnav button').forEach(b => b.classList.toggle('active', b.dataset.subtab === subtabName));
  document.querySelectorAll('.subpanel').forEach(s => s.classList.toggle('active', s.id === 'preaggs-' + subtabName));
}

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    activateTab(btn.dataset.tab);
    try { localStorage.setItem('qh-active-tab', btn.dataset.tab); } catch (e) { /* ignore */ }
  });
});

document.querySelectorAll('.subnav button').forEach(btn => {
  btn.addEventListener('click', () => {
    activateSubtab(btn.dataset.subtab);
    try { localStorage.setItem('qh-active-subtab', btn.dataset.subtab); } catch (e) { /* ignore */ }
  });
});

try {
  const storedTab = localStorage.getItem('qh-active-tab');
  if (storedTab && document.getElementById(storedTab)) activateTab(storedTab);
} catch (e) { /* localStorage unavailable -- keep the HTML default */ }
try {
  const storedSubtab = localStorage.getItem('qh-active-subtab');
  if (storedSubtab && document.getElementById('preaggs-' + storedSubtab)) activateSubtab(storedSubtab);
} catch (e) { /* ignore */ }

loadModelMeta();
loadModelFiles();
loadPreAggregations();
renderHistoryTimeRangeBar();
loadBuildHistory();
TIME_RANGE_BAR_HOSTS.forEach(renderTimeRangeBar);
ORIGIN_BAR_HOSTS.forEach(renderOriginBar);
onTimeRangeChange(loadQueryCharts);
onTimeRangeChange(loadQueryTable);
onTimeRangeChange(loadPerformanceCharts);
onTimeRangeChange(loadPerformanceMixCharts);
onTimeRangeChange(loadErrorCharts);
onTimeRangeChange(loadRecentErrors);
onOriginChange(loadQueryCharts);
onOriginChange(loadQueryTable);
onOriginChange(loadPerformanceCharts);
onOriginChange(loadPerformanceMixCharts);
loadQueryCharts();
renderQueryFilterBar();
loadQueryTable();
loadPerformanceCharts();
loadPerformanceMixCharts();
loadErrorCharts();
loadRecentErrors();
</script>
</body>
</html>
`;
