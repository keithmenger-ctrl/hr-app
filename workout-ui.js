import { Workout } from './src/workout.js';
import { bluetoothSupported } from './src/ble.js';
import { esc } from './src/util.js';

const $ = id => document.getElementById(id);

// getClients(): current client list. saveReading(id, bpm, iso): store a reading on a profile.
export function initWorkoutUI({ getClients, saveReading }) {
  let workout = null, timer = null, raf = 0, wake = null;

  function renderPick() {
    const cs = getClients();
    $('pickList').innerHTML = cs.length
      ? cs.map(c => `<label class="check"><input type="checkbox" value="${esc(c.id)}" checked> ${esc(c.name)}</label>`).join('')
      : '<p class="muted">Add clients first (Clients tab).</p>';
    $('startWorkout').disabled = !cs.length;
  }

  function tileHtml(t) {
    const z = t.zoneId == null ? 'zx' : 'z' + t.zoneId;
    let body;
    if (t.status === 'connecting') body = '<div class="pct small">Connecting…</div>';
    else if (t.status === 'idle' && t.bpm == null) body = '<div class="pct small">Tap to connect strap</div>';
    else if (t.status === 'lost' && t.bpm == null) body = '<div class="pct small">Strap lost · tap to reconnect</div>';
    else if (t.bpm == null) body = '<div class="pct">--</div>';
    else if (t.pct == null) body = `<div class="pct">${t.bpm}</div>`;
    else body = `<div class="pct">${t.pct}%</div>`;
    const warn = t.contact === false ? ' ⚠' : '';
    return `<button type="button" class="tile ${z}" data-id="${esc(t.id)}">
      <div class="tname"><span>${esc(t.name)}</span><span class="kcal">🔥 ${t.kcal}</span></div>
      ${body}
      <div class="tfoot"><span class="bpm">${t.bpm ?? ''}</span><span class="strap">${esc(t.strapName || '')}${warn}</span></div>
    </button>`;
  }

  function renderWall() {
    if (!workout) return;
    const snap = workout.snapshot();
    $('wall').innerHTML = snap.map(tileHtml).join('');
    $('wall').style.setProperty('--cols', Math.min(7, Math.max(2, Math.ceil(Math.sqrt(snap.length * 1.6)))));
    $('wallCount').textContent = `👥 ${workout.liveCount()}/${snap.length}`;
    $('wallClock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    const err = snap.find(t => t.error);
    $('wallMsg').textContent = err ? `${err.name}: ${err.error}` : '';
  }
  const scheduleRender = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderWall(); }); };

  async function keepAwake() {
    try { wake = await navigator.wakeLock?.request('screen'); } catch { /* not available */ }
  }

  function start() {
    $('setupMsg').textContent = '';
    if (!bluetoothSupported()) {
      $('setupMsg').textContent = 'This browser cannot connect to chest straps. On iPhone/iPad use the Bluefy app; otherwise use Chrome.';
      return;
    }
    const ids = [...document.querySelectorAll('#pickList input:checked')].map(i => i.value);
    const people = getClients().filter(c => ids.includes(c.id));
    if (!people.length) { $('setupMsg').textContent = 'Pick at least one person.'; return; }
    workout = new Workout(people, { onChange: scheduleRender, onReading: saveReading });
    $('wallWrap').hidden = false;
    document.body.classList.add('wallOpen');
    renderWall();
    timer = setInterval(renderWall, 1000);
    keepAwake();
  }

  function end() {
    if (!workout) return;
    if (!confirm('End the workout and disconnect all straps?')) return;
    workout.stopAll(); workout = null;
    clearInterval(timer); wake?.release?.().catch?.(() => {}); wake = null;
    $('wallWrap').hidden = true;
    document.body.classList.remove('wallOpen');
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  $('startWorkout').onclick = start;
  $('wallEnd').onclick = end;
  $('wallFull').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else $('wallWrap').requestFullscreen?.().catch(() => {});
  };
  $('wall').onclick = e => {
    const tile = e.target.closest('.tile');
    if (!tile || !workout) return;
    const id = tile.dataset.id;
    const t = workout.snapshot().find(x => x.id === id);
    if (t.status === 'live') { if (confirm(`Disconnect ${t.name}'s strap?`)) workout.disconnectParticipant(id); }
    else workout.connectParticipant(id);
  };

  return { renderPick };
}
