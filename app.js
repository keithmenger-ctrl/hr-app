import { maxHr, zoneFor, zoneRanges, ZONES } from './src/zones.js';
import { average, lowest, latest, lastDays, zoneSplit, trend, sortByTime } from './src/stats.js';
import { bluetoothSupported, connectStrap } from './src/ble.js';
import { emptyState, addClient, addReading, removeClient, parseImport, updateClient } from './src/store.js';
import { initWorkoutUI } from './workout-ui.js';

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
const pill = z => z ? `<span class="pill" style="background:${z.color};color:${z.ink}">Zone ${z.id} · ${z.name}</span>` : '<span class="pill" style="background:#888">Below zones</span>';

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

  const ef = $('editForm');
  if (!ef.contains(document.activeElement)) {
    ef.name.value = c.name; ef.age.value = c.age ?? ''; ef.maxHr.value = c.maxHr ?? '';
    ef.weightLb.value = c.weightLb ?? ''; ef.sex.value = c.sex ?? '';
  }
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
    update(addClient(state, { name: f.get('name'), age: num(f.get('age')), maxHr: num(f.get('maxHr')), weightLb: num(f.get('weightLb')), sex: f.get('sex') }));
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
$('editForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    update(updateClient(state, state.selected, { name: f.get('name'), age: num(f.get('age')), maxHr: num(f.get('maxHr')), weightLb: num(f.get('weightLb')), sex: f.get('sex') }));
    $('editBox').open = false;
  } catch (err) { alert(err.message); }
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

// ---- Chest strap ----
const SAVE_EVERY_MS = 30000; // one saved reading per 30 s while connected
let strap = null, lastSaved = 0, liveClient = null;
function setLive(html, connected) {
  $('liveBody').innerHTML = html;
  $('connect').hidden = connected;
  $('disconnect').hidden = !connected;
}
function onSample(s) {
  const c = state.clients.find(x => x.id === liveClient);
  if (!c || !s.bpm) return;
  const z = zoneFor(s.bpm, maxHr(c));
  const warn = s.contact === false ? ' <span class="error">check strap contact</span>' : '';
  setLive(`<div class="big">${s.bpm} <small class="muted" style="font-size:16px">bpm</small></div><div>${pill(z)}${warn}</div><div class="hint">Connected to ${esc(strap?.name || 'strap')} for ${esc(c.name)} · saving every 30 s</div>`, true);
  const now = Date.now();
  if (now - lastSaved >= SAVE_EVERY_MS && s.contact !== false && s.bpm >= 20 && s.bpm <= 250) {
    lastSaved = now;
    state = addReading(state, c.id, { bpm: s.bpm, time: new Date(now).toISOString(), note: 'chest strap' });
    save();
    renderSaved(); // refresh summary/history without wiping the live card
  }
}
function renderSaved() { const keep = $('liveBody').innerHTML, k = !$('disconnect').hidden; render(); setLive(keep, k); }
$('connect').onclick = async () => {
  $('bleHint').textContent = '';
  if (!bluetoothSupported()) {
    $('bleWarn').hidden = false;
    $('bleWarn').textContent = 'This browser cannot connect to a chest strap. On iPhone, open this same web address in the free Bluefy app. On Android or a computer, use Chrome.';
    return;
  }
  liveClient = state.selected;
  try {
    lastSaved = 0;
    strap = await connectStrap(onSample, () => { strap = null; setLive('Strap disconnected.', false); });
    setLive('Connected. Waiting for first heartbeat…', true);
  } catch (err) {
    $('bleHint').textContent = err.name === 'NotFoundError' ? 'No strap chosen.' : err.message;
  }
};
$('disconnect').onclick = () => { strap?.stop(); strap = null; setLive('Disconnected.', false); };
$('clientSelect').addEventListener('change', () => { if (strap) { strap.stop(); strap = null; setLive('Disconnected (client changed).', false); } });
if (!bluetoothSupported()) {
  $('bleWarn').hidden = false;
  $('bleWarn').textContent = 'This browser cannot connect to a chest strap. On iPhone, open this same web address in the free Bluefy app. On Android or a computer, use Chrome.';
}

const workoutUI = initWorkoutUI({
  getClients: () => state.clients,
  saveReading: (id, bpm, iso) => { try { state = addReading(state, id, { bpm, time: iso, note: 'workout' }); save(); } catch { /* ignore bad reading */ } },
});
function showTab(name) {
  const w = name === 'workout';
  $('clientsPane').hidden = w; $('workoutPane').hidden = !w;
  $('navClients').classList.toggle('on', !w); $('navWorkout').classList.toggle('on', w);
  if (w) workoutUI.renderPick(); else render();
}
$('navClients').onclick = () => showTab('clients');
$('navWorkout').onclick = () => showTab('workout');

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
