import { maxHr, zoneFor, zoneRanges, ZONES } from './src/zones.js';
import { sortByTime } from './src/stats.js';
import { periodWindow, periodLabel, inWindow, summarize, delta } from './src/period.js';
import { bluetoothSupported, connectStrap } from './src/ble.js';
import { emptyState, addClient, addReading, removeClient, parseImport, updateClient } from './src/store.js';
import { esc } from './src/util.js';
import { initWorkoutUI } from './workout-ui.js';

const KEY = 'hr-app-v1';
const $ = id => document.getElementById(id);
const num = v => (v === '' || v == null ? null : Number(v));

let state = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || emptyState(); } catch { return emptyState(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
function update(next) { state = next; save(); render(); }
const current = () => state.clients.find(c => c.id === state.selected);

// ---------- view state ----------
let period = 'weekly', offset = 0, unit = 'bpm';
const TABS = ['home', 'challenges', 'menu'];
const SUBS = ['profile', 'zones', 'strap', 'reading', 'clients'];
function show(name) {
  for (const t of TABS) $('tab-' + t).hidden = t !== name;
  for (const s of SUBS) $('sub-' + s).hidden = s !== name;
  document.querySelectorAll('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === name || (SUBS.includes(name) && b.dataset.tab === 'menu')));
  if (name === 'profile') fillProfile();
  window.scrollTo(0, 0);
}

const fmtDate = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const pill = z => z ? `<span class="pill" style="background:${z.color};color:${z.ink}">Zone ${z.id} · ${z.name}</span>` : '<span class="pill" style="background:#cfc6bb;color:#12100F">Below zones</span>';
const ZTEXT = { 1: '#6b7177', 2: '#2f6fe4', 3: '#1a8a3e', 4: '#a88b00', 5: '#c4271f' };

// ---------- render ----------
function render() {
  const sel = $('clientSelect');
  sel.innerHTML = state.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  sel.value = state.selected || '';
  const c = current();
  $('homeEmpty').hidden = !!c; $('homeBody').hidden = !c;
  renderMenu(c); renderZones(c); renderClientList();
  if (c) renderHome(c);
}

function bpmText(v, max, withUnit = true) {
  if (v == null) return '–';
  if (unit === 'pct' && max) return `${Math.round((v / max) * 100)}%`;
  return withUnit ? `${v} <small>bpm</small>` : String(v);
}
function deltaHtml(d, max) {
  if (d == null) return '<div class="d"></div>';
  if (d === 0) return '<div class="d">No change</div>';
  const mag = unit === 'pct' && max ? `${Math.abs(Math.round((d / max) * 100))}%` : `${Math.abs(d)}bpm`;
  return `<div class="d ${d > 0 ? 'up' : 'down'}">${d > 0 ? 'Increased +' : 'Decreased −'}${mag}</div>`;
}

function renderHome(c) {
  const max = maxHr(c);
  const w = periodWindow(period, offset), pw = periodWindow(period, offset - 1);
  const rs = inWindow(c.readings, w);
  const cur = summarize(rs, max), prev = summarize(inWindow(c.readings, pw), max);
  document.querySelectorAll('#periodTabs button').forEach(b => b.classList.toggle('on', b.dataset.p === period));
  $('rangeLabel').textContent = periodLabel(period, offset);
  $('nextRange').disabled = offset >= 0;
  $('unitBpm').classList.toggle('on', unit === 'bpm'); $('unitPct').classList.toggle('on', unit === 'pct');

  const avgColor = cur.avgZone ? ZTEXT[cur.avgZone.id] : 'inherit';
  $('cards').innerHTML = `
    <div class="stat wide"><div class="t">AVG Heart Rate</div><div class="v" style="color:${avgColor}">${bpmText(cur.avg, max)}</div>${deltaHtml(delta(cur.avg, prev.avg), max)}</div>
    <div class="stat"><div class="t">AVG Resting HR</div><div class="v">${bpmText(cur.lowest, max)}</div>${deltaHtml(delta(cur.lowest, prev.lowest), max)}</div>
    <div class="stat"><div class="t">Peak HR</div><div class="v">${bpmText(cur.peak, max)}</div>${deltaHtml(delta(cur.peak, prev.peak), max)}</div>
    <div class="stat"><div class="t">Readings</div><div class="v">${cur.count || '–'}</div><div class="d">${prev.count ? `Previous: ${prev.count}` : ''}</div></div>
    <div class="stat"><div class="t">Active days</div><div class="v">${cur.days || '–'}</div><div class="d">${prev.days ? `Previous: ${prev.days}` : ''}</div></div>`;

  const name = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[period];
  $('wkTitle').textContent = `${name} Workouts`;
  $('wkLede').textContent = `Heart rate readings for ${c.name} in this period. ${max ? `Max ${max} bpm.` : 'Add an age or max heart rate to see zones.'}`;
  const tot = cur.split.low + cur.split.moderate + cur.split.high;
  const R = 46, C = 2 * Math.PI * R;
  let acc = 0;
  const seg = (n, color) => { const len = tot ? (n / tot) * C : 0; const s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}"/>`; acc += len; return s; };
  const pct = n => (tot ? Math.round((n / tot) * 100) : 0);
  $('wkCard').innerHTML = `<div class="donutrow">
    <div class="donut"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="#E2D6C6"/>${seg(cur.split.low, '#356784')}${seg(cur.split.moderate, '#1a8a3e')}${seg(cur.split.high, '#c4271f')}</svg>
      <div class="mid"><span>READINGS</span><b>${cur.count || '--'}</b></div></div>
    <div class="splits">
      <div class="lo">Low <span>${max ? pct(cur.split.low) + '% · ' + cur.split.low : '--'}</span></div>
      <div class="mo">Moderate <span>${max ? pct(cur.split.moderate) + '% · ' + cur.split.moderate : '--'}</span></div>
      <div class="hi">High <span>${max ? pct(cur.split.high) + '% · ' + cur.split.high : '--'}</span></div>
      <p class="hint" style="margin:0">Low under 70% of max · Moderate 70–79% · High 80%+</p>
    </div></div>`;
  $('chart').innerHTML = chart(rs, max);
  $('fullList').innerHTML = sortByTime(rs).reverse().slice(0, 300).map(r => `
    <li><span>${fmtDate(r.time)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><span><b>${r.bpm}</b> ${pill(zoneFor(r.bpm, max))}</span></li>`).join('') || '<li class="muted">Nothing logged in this period.</li>';
}

function chart(rs, max) {
  const s = sortByTime(rs);
  if (s.length < 2) return '<p class="muted" style="margin:0">Log at least two readings in this period to see a trend.</p>';
  const W = 320, H = 150, P = 24;
  const t0 = Date.parse(s[0].time), t1 = Date.parse(s[s.length - 1].time);
  const vals = s.map(r => r.bpm).concat(max ? [max] : []);
  const lo = Math.max(0, Math.min(...vals) - 10), hi = Math.max(...vals) + 10;
  const x = t => P + ((t - t0) / (t1 - t0 || 1)) * (W - 2 * P);
  const y = v => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const bands = max ? ZONES.map(z => `<rect x="${P}" width="${W - 2 * P}" y="${y(Math.min(z.max * max, hi))}" height="${Math.max(0, y(Math.max(z.min * max, lo)) - y(Math.min(z.max * max, hi)))}" fill="${z.color}" opacity=".2"/>`).join('') : '';
  const pts = s.map(r => [x(Date.parse(r.time)).toFixed(1), y(r.bpm).toFixed(1)]);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Heart rate over time">${bands}
    <polyline fill="none" stroke="#356784" stroke-width="2.2" points="${pts.map(p => p.join(',')).join(' ')}"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#356784"/>`).join('')}
    <text x="2" y="${y(hi) + 8}" font-size="10" fill="#6d645b">${Math.round(hi)}</text><text x="2" y="${y(lo)}" font-size="10" fill="#6d645b">${Math.round(lo)}</text></svg>`;
}

function renderMenu(c) {
  $('remove').hidden = !c;
  if (!c) { $('menuHead').innerHTML = '<div class="avatar"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></div><div class="nm">No client yet</div><div class="sb">Add one under "All clients"</div>'; return; }
  const max = maxHr(c);
  $('menuHead').innerHTML = `<div class="avatar"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></div>
    <div class="nm">${esc(c.name)}</div><div class="sb">${c.sex ? esc(c.sex[0].toUpperCase() + c.sex.slice(1)) : 'Client profile'}</div>
    <div class="statbar"><div><b>${c.weightLb ?? '–'}</b><span>lb weight</span></div><div><b>${max ?? '–'}</b><span>bpm max</span></div><div><b>${c.age ?? '–'}</b><span>yr age</span></div></div>`;
}

function renderZones(c) {
  const max = c && maxHr(c);
  $('zonesBody').innerHTML = max
    ? `<p class="hint" style="margin-top:0">Based on ${esc(c.name)}'s max of ${max} bpm.</p>` + zoneRanges(max).map(z => `<div class="zrow"><i class="zchip" style="background:${z.color}"></i>Zone ${z.id} · ${z.name}<span>${z.from}–${z.to} bpm</span></div>`).join('')
    : '<p class="muted" style="margin:0">Add an age or max heart rate in Profile details to see zones.</p>';
}

function renderClientList() {
  $('clientList').innerHTML = state.clients.length
    ? state.clients.map(c => `<button type="button" class="row ${c.id === state.selected ? 'cur' : ''}" data-pick="${esc(c.id)}"><span>${esc(c.name)}</span><i></i></button>`).join('')
    : '<p class="muted" style="padding:14px;margin:0">No clients yet.</p>';
}

function fillProfile() {
  const c = current(), f = $('editForm');
  if (!c) return;
  f.name.value = c.name; f.age.value = c.age ?? ''; f.maxHr.value = c.maxHr ?? '';
  f.weightLb.value = c.weightLb ?? ''; f.sex.value = c.sex ?? '';
}

// ---------- wiring ----------
document.querySelectorAll('#tabbar [data-tab]').forEach(b => (b.onclick = () => show(b.dataset.tab)));
document.addEventListener('click', e => {
  const sub = e.target.closest('[data-sub]'); if (sub) return show(sub.dataset.sub);
  if (e.target.closest('[data-back]')) return show('menu');
  const pick = e.target.closest('[data-pick]'); if (pick) { update({ ...state, selected: pick.dataset.pick }); show('home'); }
});
$('clientSelect').onchange = e => update({ ...state, selected: e.target.value });
$('periodTabs').onclick = e => { const b = e.target.closest('button'); if (b) { period = b.dataset.p; offset = 0; render(); } };
$('prevRange').onclick = () => { offset -= 1; render(); };
$('nextRange').onclick = () => { if (offset < 0) { offset += 1; render(); } };
$('unitBpm').onclick = () => { unit = 'bpm'; render(); };
$('unitPct').onclick = () => { unit = 'pct'; render(); };
$('fullListBtn').onclick = () => { const l = $('fullList'); l.hidden = !l.hidden; $('fullListBtn').textContent = l.hidden ? 'Full Workout List' : 'Hide Workout List'; };

$('clientForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    update(addClient(state, { name: f.get('name'), age: num(f.get('age')), maxHr: num(f.get('maxHr')), weightLb: num(f.get('weightLb')), sex: f.get('sex') }));
    e.target.reset(); show('home');
  } catch (err) { alert(err.message); }
};
$('editForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    update(updateClient(state, state.selected, { name: f.get('name'), age: num(f.get('age')), maxHr: num(f.get('maxHr')), weightLb: num(f.get('weightLb')), sex: f.get('sex') }));
    show('menu');
  } catch (err) { alert(err.message); }
};
$('readingForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  $('error').textContent = '';
  if (!state.selected) { $('error').textContent = 'Add a client first.'; return; }
  try {
    const t = f.get('time');
    update(addReading(state, state.selected, { bpm: f.get('bpm'), time: t ? new Date(t).toISOString() : undefined, note: f.get('note') }));
    e.target.reset(); show('home');
  } catch (err) { $('error').textContent = err.message; }
};
$('remove').onclick = () => { if (confirm(`Delete ${current().name} and all their readings?`)) { update(removeClient(state, state.selected)); show('home'); } };
function doExport() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = 'heart-rate-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
$('export').onclick = doExport; $('exportTop').onclick = doExport;
$('import').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try { if (confirm('Replace current data with this backup?')) { update(parseImport(await file.text())); show('home'); } }
  catch (err) { alert(err.message); }
  e.target.value = '';
};

// ---------- single chest strap (selected client) ----------
const SAVE_EVERY_MS = 30000;
let strap = null, lastSaved = 0, liveClient = null;
function setLive(html, connected) { $('liveBody').innerHTML = html; $('connect').hidden = connected; $('disconnect').hidden = !connected; }
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
    save(); render();
  }
}
const NO_BT = 'This browser cannot connect to a chest strap. On iPhone, open this same web address in the free Bluefy app. On Android or a computer, use Chrome.';
$('connect').onclick = async () => {
  $('bleHint').textContent = '';
  if (!bluetoothSupported()) { $('bleWarn').hidden = false; $('bleWarn').textContent = NO_BT; return; }
  if (!state.selected) { $('bleHint').textContent = 'Add a client first.'; return; }
  liveClient = state.selected;
  try {
    lastSaved = 0;
    strap = await connectStrap(onSample, () => { strap = null; setLive('Strap disconnected.', false); });
    setLive('Connected. Waiting for first heartbeat…', true);
  } catch (err) { $('bleHint').textContent = err.name === 'NotFoundError' ? 'No strap chosen.' : err.message; }
};
$('disconnect').onclick = () => { strap?.stop(); strap = null; setLive('Disconnected.', false); };
$('clientSelect').addEventListener('change', () => { if (strap) { strap.stop(); strap = null; setLive('Disconnected (client changed).', false); } });
if (!bluetoothSupported()) { $('bleWarn').hidden = false; $('bleWarn').textContent = NO_BT; }

// ---------- TRAIN (group workout) ----------
const workoutUI = initWorkoutUI({
  getClients: () => state.clients,
  saveReading: (id, bpm, iso) => { try { state = addReading(state, id, { bpm, time: iso, note: 'workout' }); save(); } catch { /* ignore bad reading */ } },
});
$('trainBtn').onclick = () => { workoutUI.renderPick(); $('setupMsg').textContent = ''; $('trainSheet').hidden = false; };
$('trainBack').onclick = () => { $('trainSheet').hidden = true; };

render();
show('home');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
