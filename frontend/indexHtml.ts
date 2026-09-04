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
  .muted { color: #6b7280; }
  .err { color: #f87171; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; }
  .loading { color: #6b7280; font-size: 13px; }

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
    <h2>Pre-aggregations &amp; partitions</h2>
    <div id="preagg-table-host" class="loading">Loading&hellip;</div>
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
          el('td', null, [m.aggType || m.type || '']),
          el('td', null, [m.title || '']),
        ])),
      ]);
      const dTable = el('table', null, [
        el('tr', null, [el('th', null, ['Dimension']), el('th', null, ['Type']), el('th', null, ['Title'])]),
        ...(cube.dimensions || []).map(d => el('tr', null, [
          el('td', null, [el('code', null, [d.name])]),
          el('td', null, [d.type || '']),
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

async function loadModelFiles() {
  const host = document.getElementById('model-files');
  try {
    const data = await getJSON('/api/model/files');
    host.innerHTML = '';
    for (const f of data.files || []) {
      host.append(el('h3', null, [f.name]));
      host.append(el('pre', null, [f.content]));
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

const COLUMNS = [
  { key: 'preAggId', label: 'Pre-aggregation', sort: (r) => r.preAggId },
  { key: 'tableName', label: 'Table name', sort: (r) => r.partition.tableName || '' },
  { key: 'buildRangeStart', label: 'Build range', sort: (r) => r.partition.buildRangeStart || '' },
  { key: 'sealAt', label: 'Seal at', sort: (r) => r.partition.sealAt || '' },
  { key: 'lastUpdated', label: 'Last updated', sort: (r) => lastUpdated(r.partition) || 0 },
];

let sortState = { key: 'lastUpdated', dir: 'desc' };

function renderPreaggTable(rows) {
  const host = document.getElementById('preagg-table-host');
  host.innerHTML = '';

  if (!rows.length) {
    host.append(el('div', { class: 'muted' }, ['No partitions found.']));
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
      renderPreaggTable(rows);
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
    renderPreaggTable(rows);
  } catch (e) {
    host.innerHTML = '';
    host.append(errBox(e));
  }
}

// --- Tabs ---

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

loadModelMeta();
loadModelFiles();
loadPreAggregations();
</script>
</body>
</html>
`;
