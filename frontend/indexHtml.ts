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
<title>Cube ops dashboard</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; background: #0b0d10; color: #e6e6e6; }
  header { padding: 14px 20px; border-bottom: 1px solid #23262b; display: flex; gap: 16px; align-items: center; }
  header h1 { font-size: 15px; margin: 0; font-weight: 600; color: #9aa4b2; }
  nav { display: flex; gap: 4px; }
  nav button { background: none; border: none; color: #9aa4b2; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  nav button.active { background: #1a1d22; color: #fff; }
  main { padding: 20px; max-width: 1200px; margin: 0 auto; }
  section { display: none; }
  section.active { display: block; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin: 24px 0 10px; }
  h2:first-child { margin-top: 0; }
  .subnav { display: flex; gap: 4px; border-bottom: 1px solid #23262b; margin-bottom: 16px; }
  .subnav button { background: none; border: none; color: #9aa4b2; padding: 8px 4px; margin-right: 16px; cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; }
  .subnav button.active { color: #fff; border-bottom-color: #4ade80; }
  .timerange-bar { display: flex; gap: 6px; margin-bottom: 16px; }
  .timerange-bar button { background: #111318; border: 1px solid #23262b; color: #9aa4b2; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .timerange-bar button:hover { border-color: #3b4252; }
  .timerange-bar button.active { background: #1a1d22; color: #fff; border-color: #4ade80; }
  .subpanel { display: none; }
  .subpanel.active { display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #1c1f24; vertical-align: top; }
  th { color: #6b7280; font-weight: 500; }
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
  .json-key { color: #93c5fd; }
  .json-string { color: #86efac; }
  .json-number { color: #fdba74; }
  .json-boolean, .json-null { color: #c4b5fd; }
  .json-punct { color: #6b7280; }
  .query-preview { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }

  /* Hand-rolled SVG charts -- no charting library, same reasoning as the
     hand-rolled JS/JSON highlighters below. */
  .charts-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
  .chart-card { border: 1px solid #23262b; border-radius: 10px; padding: 14px 16px; flex: 1; min-width: 320px; }
  .chart-card h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; font-weight: 500; }
  .chart-card svg { display: block; width: 100%; height: auto; }
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
  .gen-list { list-style: none; margin: 0; padding: 0; }
  .gen-list li { padding: 5px 0; border-bottom: 1px solid #1c1f24; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; display: flex; justify-content: space-between; gap: 12px; }
  .gen-list li:last-child { border-bottom: none; }

  /* Sortable partitions table */
  #preagg-table th[data-sort] { cursor: pointer; user-select: none; white-space: nowrap; }
  #preagg-table th[data-sort]:hover { color: #cbd5e1; }
  #preagg-table th .arrow { display: inline-block; width: 10px; opacity: 0.6; }
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
  details { border: 1px solid #23262b; border-radius: 8px; margin-top: 8px; }
  summary { padding: 8px 12px; cursor: pointer; font-size: 13px; }
  details[open] summary { border-bottom: 1px solid #23262b; }
  .detail-body { padding: 10px 12px; }
</style>
</head>
<body>
<header>
  <h1>Cube ops dashboard &middot; self-hosted</h1>
  <nav>
    <button data-tab="model" class="active">Data model</button>
    <button data-tab="preaggs">Pre-aggregations</button>
    <button data-tab="queries">Query history</button>
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
      <div id="history-filter-host"></div>
      <div id="history-list-host" class="loading">Loading&hellip;</div>
    </div>
  </section>
  <section id="queries">
    <div id="query-timerange-host"></div>
    <h2>Query volume &amp; duration</h2>
    <div id="query-charts-host" class="loading">Loading&hellip;</div>
    <h2>Queries</h2>
    <div id="query-filter-host"></div>
    <div id="query-table-host" class="loading">Loading&hellip;</div>
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
  { key: 'preAggId', label: 'Pre-aggregation', sort: (r) => r.preAggId },
  { key: 'tableName', label: 'Table name', sort: (r) => r.partition.tableName || '' },
  { key: 'buildRangeStart', label: 'Build range', sort: (r) => r.partition.buildRangeStart || '' },
  { key: 'sealAt', label: 'Seal at', sort: (r) => r.partition.sealAt || '' },
  { key: 'lastUpdated', label: 'Last updated', sort: (r) => lastUpdated(r.partition) || 0 },
];

let sortState = { key: 'lastUpdated', dir: 'desc' };
let preaggFilterState = { preAggId: '', search: '' };
let preaggAllRows = [];

function renderPreaggTable() {
  const host = document.getElementById('preagg-table-host');
  host.innerHTML = '';

  const rows = preaggAllRows.filter(r => matchesFilter(r.preAggId, r.partition.tableName, preaggFilterState));

  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, [preaggAllRows.length ? 'No partitions match this filter.' : 'No partitions found.']));
    return;
  }

  const sorted = rows.slice().sort((a, b) => {
    const col = COLUMNS.find(c => c.key === sortState.key);
    const av = col.sort(a), bv = col.sort(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortState.dir === 'asc' ? cmp : -cmp;
  });

  const thead = el('tr', null, COLUMNS.map(col => {
    const arrow = sortState.key === col.key ? (sortState.dir === 'asc' ? '\\u2191' : '\\u2193') : '';
    const th = el('th', { 'data-sort': col.key }, [col.label, ' ', el('span', { class: 'arrow' }, [arrow])]);
    th.addEventListener('click', () => {
      if (sortState.key === col.key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sortState = { key: col.key, dir: col.key === 'lastUpdated' ? 'desc' : 'asc' };
      }
      renderPreaggTable();
    });
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
    const ids = [...new Set(rows.map(r => r.preAggId))].sort();
    renderFilterBar('preagg-filter-host', ids, preaggFilterState, renderPreaggTable);
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

let historyFilterState = { preAggId: '', search: '' };
let historyAllGroups = []; // [{ preAggId, group }]

function renderHistoryList() {
  const host = document.getElementById('history-list-host');
  host.innerHTML = '';

  const rows = historyAllGroups.filter(r => matchesFilter(r.preAggId, r.group.logicalName, historyFilterState));

  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, [historyAllGroups.length ? 'No partitions match this filter.' : 'No history found.']));
    return;
  }

  const sorted = rows.slice().sort((a, b) => {
    const at = a.group.generations[0] ? a.group.generations[0].createdAt : '';
    const bt = b.group.generations[0] ? b.group.generations[0].createdAt : '';
    return bt < at ? -1 : bt > at ? 1 : 0; // most recent build first
  });

  const thead = el('tr', null, [
    el('th', null, ['Pre-aggregation']),
    el('th', null, ['Partition']),
    el('th', null, ['Generations']),
    el('th', null, ['Most recent build']),
  ]);

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
        ' (updateWindow). ',
        el('br', null, []),
        el('span', { class: 'muted' }, [
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

// --- Hand-rolled SVG bar charts -- no charting library, same reasoning
// as the hand-rolled syntax highlighters: keeps this one embedded file
// with no CDN dependency.

function svgEl(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Fixed-width, centered bars rather than stretching to fill the card --
// with only 1-2 buckets (a fresh deployment, or a quiet period) stretched
// bars rendered as one giant solid block indistinguishable from a plain
// rectangle. Baseline + per-bar value label + hour labels make it read as
// an actual chart even with very little data, not just at high volume.
function renderBarChart(host, buckets, valueFn, color, formatValue, titleText) {
  const card = el('div', { class: 'chart-card' }, [el('h3', null, [titleText])]);
  if (!buckets.length) {
    card.append(el('div', { class: 'chart-empty' }, ['No data yet.']));
    host.append(card);
    return;
  }
  const width = 600, height = 160, padTop = 18, padBottom = 28, padSide = 10;
  const plotHeight = height - padTop - padBottom;
  const values = buckets.map(valueFn);
  const max = Math.max.apply(null, values.concat([1]));
  const slot = (width - padSide * 2) / buckets.length;
  const barWidth = Math.min(slot * 0.6, 48);
  const svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: 'xMidYMid meet' });

  svg.append(svgEl('line', {
    x1: padSide, y1: height - padBottom, x2: width - padSide, y2: height - padBottom,
    stroke: '#23262b', 'stroke-width': 1,
  }));

  const showValueLabels = buckets.length <= 24;
  const labelStride = Math.max(1, Math.ceil(buckets.length / 12));

  buckets.forEach((b, i) => {
    const v = values[i];
    const barHeight = v > 0 ? Math.max((v / max) * plotHeight, 2) : 0;
    const slotX = padSide + i * slot;
    const x = slotX + (slot - barWidth) / 2;
    const y = height - padBottom - barHeight;

    const rect = svgEl('rect', { x: x, y: y, width: barWidth, height: barHeight, fill: color, rx: 2 });
    const titleNode = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleNode.textContent = b.bucket + ': ' + formatValue(v);
    rect.append(titleNode);
    svg.append(rect);

    if (showValueLabels && v > 0) {
      const label = svgEl('text', {
        x: slotX + slot / 2, y: y - 4, 'text-anchor': 'middle', 'font-size': '9', fill: '#9aa4b2',
      });
      label.textContent = formatValue(v);
      svg.append(label);
    }

    if (i % labelStride === 0) {
      const xLabel = svgEl('text', {
        x: slotX + slot / 2, y: height - padBottom + 14, 'text-anchor': 'middle', 'font-size': '9', fill: '#6b7280',
      });
      xLabel.textContent = new Date(b.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      svg.append(xLabel);
    }
  });

  card.append(svg);
  host.append(card);
}

// Same axes/padding/labeling as renderBarChart, connected points instead
// of bars -- a more natural read for a continuously-varying value like
// average duration than discrete bars.
function renderLineChart(host, buckets, valueFn, color, formatValue, titleText) {
  const card = el('div', { class: 'chart-card' }, [el('h3', null, [titleText])]);
  if (!buckets.length) {
    card.append(el('div', { class: 'chart-empty' }, ['No data yet.']));
    host.append(card);
    return;
  }
  const width = 600, height = 160, padTop = 18, padBottom = 28, padSide = 10;
  const plotHeight = height - padTop - padBottom;
  const values = buckets.map(valueFn);
  const max = Math.max.apply(null, values.concat([1]));
  const slot = (width - padSide * 2) / buckets.length;
  const svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: 'xMidYMid meet' });

  svg.append(svgEl('line', {
    x1: padSide, y1: height - padBottom, x2: width - padSide, y2: height - padBottom,
    stroke: '#23262b', 'stroke-width': 1,
  }));

  const points = buckets.map((b, i) => {
    const v = values[i];
    const x = padSide + i * slot + slot / 2;
    const y = height - padBottom - (max > 0 ? (v / max) * plotHeight : 0);
    return { x: x, y: y, v: v, bucket: b.bucket };
  });

  if (points.length > 1) {
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    svg.append(svgEl('path', {
      d: pathD, fill: 'none', stroke: color, 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
  }

  const showValueLabels = buckets.length <= 24;
  const labelStride = Math.max(1, Math.ceil(buckets.length / 12));

  points.forEach((p, i) => {
    const dot = svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: color });
    const titleNode = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleNode.textContent = p.bucket + ': ' + formatValue(p.v);
    dot.append(titleNode);
    svg.append(dot);

    if (showValueLabels && p.v > 0) {
      const label = svgEl('text', { x: p.x, y: p.y - 6, 'text-anchor': 'middle', 'font-size': '9', fill: '#9aa4b2' });
      label.textContent = formatValue(p.v);
      svg.append(label);
    }

    if (i % labelStride === 0) {
      const xLabel = svgEl('text', {
        x: p.x, y: height - padBottom + 14, 'text-anchor': 'middle', 'font-size': '9', fill: '#6b7280',
      });
      xLabel.textContent = new Date(p.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      svg.append(xLabel);
    }
  });

  card.append(svg);
  host.append(card);
}

// --- Time range selector (drives both the charts and the table below) ---

const TIME_RANGES = [
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '1h', minutes: 60 },
  { label: '6h', minutes: 6 * 60 },
  { label: '24h', minutes: 24 * 60 },
  { label: '7d', minutes: 7 * 24 * 60 },
];

function loadStoredTimeRangeMinutes() {
  try {
    const stored = Number(localStorage.getItem('qh-timerange-minutes'));
    if (TIME_RANGES.some(r => r.minutes === stored)) return stored;
  } catch (e) { /* localStorage unavailable (private browsing, etc.) -- fall through to default */ }
  return 60;
}

let queryTimeRangeMinutes = loadStoredTimeRangeMinutes();

function currentRangeLabel() {
  const match = TIME_RANGES.find(r => r.minutes === queryTimeRangeMinutes);
  return match ? match.label : (queryTimeRangeMinutes + 'm');
}

function renderTimeRangeBar() {
  const host = document.getElementById('query-timerange-host');
  host.innerHTML = '';
  const bar = el('div', { class: 'timerange-bar' });
  for (const range of TIME_RANGES) {
    const btn = el('button', {}, ['Last ' + range.label]);
    if (range.minutes === queryTimeRangeMinutes) btn.classList.add('active');
    btn.addEventListener('click', () => {
      queryTimeRangeMinutes = range.minutes;
      try { localStorage.setItem('qh-timerange-minutes', String(range.minutes)); } catch (e) { /* ignore */ }
      renderTimeRangeBar();
      loadQueryCharts();
      loadQueryTable();
    });
    bar.append(btn);
  }
  host.append(bar);
}

async function loadQueryCharts() {
  const host = document.getElementById('query-charts-host');
  try {
    const data = await getJSON('/api/query-history/stats?sinceMinutes=' + queryTimeRangeMinutes);
    const buckets = data.buckets || [];
    host.innerHTML = '';
    const row = el('div', { class: 'charts-row' });
    host.append(row);
    renderBarChart(row, buckets, b => b.count, '#93c5fd', v => String(v) + ' queries', 'Query count (last ' + currentRangeLabel() + ')');
    renderLineChart(row, buckets, b => b.avgDurationMs || 0, '#f9a8d4', v => fmtMs(Math.round(v)), 'Avg duration (last ' + currentRangeLabel() + ')');
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Query table, filter, overlay ---

let queryFilterState = { status: '', search: '' };
let queryFilterDebounce;

function renderQueryFilterBar() {
  const host = document.getElementById('query-filter-host');
  host.innerHTML = '';
  const select = el('select', null, [
    el('option', { value: '' }, ['All statuses']),
    el('option', { value: 'success' }, ['success']),
    el('option', { value: 'error' }, ['error']),
    el('option', { value: 'pending' }, ['pending']),
  ]);
  select.value = queryFilterState.status;
  select.addEventListener('change', () => { queryFilterState.status = select.value; loadQueryTable(); });

  const input = el('input', { type: 'search', placeholder: 'Search query\\u2026' });
  input.value = queryFilterState.search;
  input.addEventListener('input', () => {
    queryFilterState.search = input.value.trim();
    clearTimeout(queryFilterDebounce);
    queryFilterDebounce = setTimeout(loadQueryTable, 300);
  });

  host.append(el('div', { class: 'filter-bar' }, [select, input]));
}

// usedPreAggregation: 1 = resolved from a rollup already in Cube Store
// (fast path), 0 = hit the source database directly, null = unknown (the
// query never got far enough to tell -- most error types). servedStaleCache
// is a separate, orthogonal signal: Cube served an already-cached result
// because the freshness recheck was too slow to wait on -- can happen
// either way, so it's a second badge, not an alternative to the first.
function sourcePill(row) {
  const pills = [];
  if (row.usedPreAggregation === 1) {
    pills.push(el('span', { class: 'pill source-preagg' }, ['pre-aggregation']));
  } else if (row.usedPreAggregation === 0) {
    pills.push(el('span', { class: 'pill source-scan' }, ['source scan']));
  } else {
    pills.push(el('span', { class: 'pill source-unknown' }, ['unknown']));
  }
  if (row.servedStaleCache) {
    pills.push(el('span', { class: 'pill cache-stale' }, ['stale cache']));
  }
  return pills;
}

function openQueryOverlay(row) {
  document.getElementById('overlay-title').textContent = row.requestId || ('Query #' + row.id);
  const body = document.getElementById('overlay-body');
  body.innerHTML = '';

  const dl = el('dl', { class: 'field-grid' });
  const fields = [
    ['Status', row.status],
    ['Type', row.type],
    ['Duration', fmtMs(row.durationMs)],
    ['Started at', fmtDate(row.startedAt)],
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
  dl.append(el('dt', null, ['Source']), el('dd', null, sourcePill(row)));
  body.append(dl);

  if (row.errorMessage) {
    body.append(el('div', { class: 'muted' }, ['Error:']));
    body.append(el('pre', null, [row.errorMessage]));
  }

  body.append(el('div', { class: 'muted' }, ['Query:']));
  const pre = el('pre', null, []);
  pre.innerHTML = highlightJson(row.queryJson || '{}', true);
  body.append(pre);

  document.getElementById('overlay-backdrop').hidden = false;
}

function renderQueryTable(rows) {
  const host = document.getElementById('query-table-host');
  host.innerHTML = '';
  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, ['No queries recorded yet.']));
    return;
  }
  const thead = el('tr', null, [
    el('th', null, ['Status']),
    el('th', null, ['Started at']),
    el('th', null, ['Duration']),
    el('th', null, ['Source']),
    el('th', null, ['API type']),
    el('th', null, ['Query preview']),
  ]);
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
    if (queryFilterState.status) params.set('status', queryFilterState.status);
    if (queryFilterState.search) params.set('search', queryFilterState.search);
    params.set('sinceMinutes', String(queryTimeRangeMinutes));
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
loadBuildHistory();
renderTimeRangeBar();
loadQueryCharts();
renderQueryFilterBar();
loadQueryTable();
</script>
</body>
</html>
`;
