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
  pre { background: #111318; border: 1px solid #23262b; border-radius: 8px; padding: 14px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  .cube-block { border: 1px solid #23262b; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
  .cube-block h3 { margin: 0 0 8px; font-size: 14px; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; background: #1a1d22; color: #9aa4b2; margin-left: 6px; }
  .pill.ready { background: #123a20; color: #4ade80; }
  .pill.notready { background: #3a1212; color: #f87171; }
  details { border: 1px solid #23262b; border-radius: 8px; margin-bottom: 8px; }
  summary { padding: 8px 12px; cursor: pointer; font-size: 13px; }
  details[open] summary { border-bottom: 1px solid #23262b; }
  .detail-body { padding: 10px 12px; }
  .muted { color: #6b7280; }
  .err { color: #f87171; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; }
  .loading { color: #6b7280; font-size: 13px; }
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
    <div id="preagg-list" class="loading">Loading&hellip;</div>
  </section>
</main>
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

// Field set + shapes confirmed live against the self-hosted deployment
// (POST /cubejs-system/v1/pre-aggregations/partitions with expand=
// partitions.details,meta,versions) -- see the plan's verification notes.
// Not every field on a partition is shown here; the "Raw partition JSON"
// details block below always has everything, so nothing is silently lost
// if a future Cube version adds or renames fields.
const KNOWN_PARTITION_FIELDS = [
  ['tableName', 'Table name'],
  ['dataSource', 'Data source'],
  ['type', 'Type'],
  ['granularity', 'Granularity'],
  ['partitionGranularity', 'Partition granularity'],
  ['buildRangeStart', 'Build range start'],
  ['buildRangeEnd', 'Build range end'],
  ['sealAt', 'Seal at'],
];

function renderVersionEntries(entries) {
  if (!entries || !entries.length) return el('div', { class: 'muted' }, ['No version entries.']);
  const rows = entries.map(v => el('tr', null, [
    el('td', null, [v.content_version || '']),
    el('td', null, [v.structure_version || '']),
    el('td', null, [v.last_updated_at ? new Date(v.last_updated_at).toLocaleString() : '']),
  ]));
  return el('table', null, [
    el('tr', null, [el('th', null, ['Content version']), el('th', null, ['Structure version']), el('th', null, ['Last updated'])]),
    ...rows,
  ]);
}

async function loadPreAggregations() {
  const host = document.getElementById('preagg-list');
  try {
    const [defs, partitionsResp] = await Promise.all([
      getJSON('/api/pre-aggregations'),
      getJSON('/api/pre-aggregations/partitions'),
    ]);
    host.innerHTML = '';

    const byId = {};
    for (const group of (partitionsResp.preAggregationPartitions || [])) {
      const id = group.preAggregation && group.preAggregation.id;
      if (id) byId[id] = group;
    }

    const definedList = defs.preAggregations || defs || [];
    const ids = Array.isArray(definedList)
      ? definedList.map(p => (typeof p === 'string' ? p : p.id)).filter(Boolean)
      : Object.keys(byId);

    for (const id of (ids.length ? ids : Object.keys(byId))) {
      const group = byId[id];
      const details = el('details', null, [
        el('summary', null, [
          id,
          group ? el('span', { class: 'pill' }, [(group.partitions || []).length + ' partitions']) : '',
        ]),
      ]);
      const body = el('div', { class: 'detail-body' });
      if (!group) {
        body.append(el('div', { class: 'muted' }, ['No partition data returned for this pre-aggregation.']));
      } else if (group.errors && group.errors.length) {
        body.append(el('div', { class: 'err' }, [JSON.stringify(group.errors, null, 2)]));
      } else {
        for (const partition of (group.partitions || [])) {
          const pBlock = el('div', { class: 'cube-block' });
          const summaryTable = el('table', null, [
            ...KNOWN_PARTITION_FIELDS
              .filter(([key]) => partition[key] !== undefined)
              .map(([key, label]) => el('tr', null, [el('th', null, [label]), el('td', null, [String(partition[key])])])),
          ]);
          pBlock.append(summaryTable);
          if (partition.versionEntries) {
            pBlock.append(el('div', { class: 'muted' }, ['Build history:']));
            pBlock.append(renderVersionEntries(partition.versionEntries));
          }
          const raw = el('details', null, [el('summary', null, ['Raw partition JSON'])]);
          raw.append(el('div', { class: 'detail-body' }, [el('pre', null, [JSON.stringify(partition, null, 2)])]));
          pBlock.append(raw);
          body.append(pBlock);
        }
        if (group.invalidateKeyQueries) {
          const inv = el('details', null, [el('summary', null, ['Invalidation keys'])]);
          inv.append(el('div', { class: 'detail-body' }, [el('pre', null, [JSON.stringify(group.invalidateKeyQueries, null, 2)])]));
          body.append(inv);
        }
      }
      details.append(body);
      host.append(details);
    }
    if (!ids.length && !Object.keys(byId).length) {
      host.append(el('div', { class: 'muted' }, ['No pre-aggregations found.']));
    }
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
