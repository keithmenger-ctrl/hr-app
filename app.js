import { maxHr, zoneFor, zoneRanges, ZONES } from './src/zones.js';
import { average, lowest, latest, lastDays, zoneSplit, trend, sortByTime } from './src/stats.js';
import { emptyState, addClient, addReading, removeClient, parseImport } from './src/store.js';

const KEY = 'hr-app-v1';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let state = load();
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || emptyState(); } catch { return emptyState(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
function update(next) { state = next; save(); render(); }

const current = () => state.clients.find(c => c.id === state.selected);
const fmt = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const pill = z => z ? `<span class="pill" style="background:${z.color}">Zone ${z.id} · ${z.name}</span>` : '<span class="pill" style="background:#888">Below zones</span>';

function render() {
  const sel = $('clientSelect');
  sel.innerHTML = state.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  sel.value = state.selected || '';
  sel.hidden = !state.clients.length;
  $('empty').hidden = !!state.clients.length;
  $('addClientBox').open = !state.clients.length;
  const c = current();
  $('clientView').hidden = !c;
  if (!c) return;

  const max = maxHr(c);
  const rs = c.readings;
  const last = latest(rs);
  const wk = lastDays(rs, 7);
  $('summary').innerHTML = `
    <div class="muted">${esc(c.name)} · max ${max ?? '?'} bpm</div>
    ${last ? `<div class="big">${last.bpm} <small class="muted" style="font-size:16px">bpm</small></div>
      <div>${pill(zoneFor(last.bpm, max))} <span class="muted">${fmt(last.time)}</span></div>`
      : '<p class="muted">No readings yet.</p>'}
    <div class="stats">
      <div><b>${average(wk) ?? '–'}</b><span>7-day avg</span></div>
      <div><b>${lowest(rs) ?? '–'}</b><span>lowest</span></div>
      <div><b>${trend(rs)}</b><span>trend</span></div>
    </div>`;

  if (!max) {
    $('zones').innerHTML = '<p class="muted">Add an age or max heart rate to see zones.</p>';
  } else {
    const split = zoneSplit(rs, max);
    $('zones').innerHTML = zoneRanges(max).map(z => `
      <div class="zonerow"><span class="name">Z${z.id} ${z.name}<br><small class="muted">${z.from}–${z.to} bpm</small></span>
      <span class="bar"><i style="width:${Math.round(split[z.id] * 100)}%;background:${z.color}"></i></span>
      <span class="pct">${Math.round(split[z.id] * 100)}%</span></div>`).join('');
  }
  $('chart').innerHTML = chart(rs, max);
  $('history').innerHTML = sortByTime(rs).reverse().slice(0, 50).map(r => `
    <li><span>${fmt(r.time)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span>
    <span><b>${r.bpm}</b> ${pill(zoneFor(r.bpm, max))}</span></li>`).join('') || '<li class="muted">Nothing logged yet.</li>';
}

function chart(rs, max) {
  const s = sortByTime(rs);
  if (s.length < 2) return '<p class="muted">Log at least two readings to see a trend.</p>';
  const W = 320, H = 160, P = 24;
  const t0 = Date.parse(s[0].time), t1 = Date.parse(s[s.length - 1].time) || t0 + 1;
  const vals = s.map(r => r.bpm).concat(max ? [max] : []);
  const lo = Math.max(0, Math.min(...vals) - 10), hi = Math.max(...vals) + 10;
  const x = t => P + ((t - t0) / (t1 - t0 || 1)) * (W - 2 * P);
  const y = v => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const bands = max ? ZONES.map(z => `<rect x="${P}" width="${W - 2 * P}" y="${y(Math.min(z.max * max, hi))}" height="${Math.max(0, y(Math.max(z.min * max, lo)) - y(Math.min(z.max * max, hi)))}" fill="${z.color}" opacity=".18"/>`).join('') : '';
  const pts = s.map(r => `${x(Date.parse(r.time)).toFixed(1)},${y(r.bpm).toFixed(1)}`);
  const dots = s.map((r, i) => `<circle cx="${pts[i].split(',')[0]}" cy="${pts[i].split(',')[1]}" r="3" fill="var(--accent)"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Heart rate over time">${bands}
    <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts.join(' ')}"/>${dots}
    <text x="2" y="${y(hi) + 8}" font-size="10" fill="var(--muted)">${Math.round(hi)}</text>
    <text x="2" y="${y(lo)}" font-size="10" fill="var(--muted)">${Math.round(lo)}</text></svg>`;
}

const num = v => (v === '' || v == null ? null : Number(v));

$('clientSelect').onchange = e => update({ ...state, selected: e.target.value });
$('clientForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    update(addClient(state, { name: f.get('name'), age: num(f.get('age')), maxHr: num(f.get('maxHr')) }));
    e.target.reset();
  } catch (err) { alert(err.message); }
};
$('readingForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  $('error').textContent = '';
  try {
    const t = f.get('time');
    update(addReading(state, state.selected, { bpm: f.get('bpm'), time: t ? new Date(t).toISOString() : undefined, note: f.get('note') }));
    e.target.reset();
  } catch (err) { $('error').textContent = err.message; }
};
$('remove').onclick = () => { if (confirm(`Delete ${current().name} and all their readings?`)) update(removeClient(state, state.selected)); };
$('export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = 'heart-rate-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
};
$('import').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (confirm('Replace current data with this backup?')) update(parseImport(await file.text()));
  } catch (err) { alert(err.message); }
  e.target.value = '';
};

render();
