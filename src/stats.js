import { zoneFor, ZONES } from './zones.js';

export function validReading(r) {
  return r && Number.isFinite(r.bpm) && r.bpm >= 20 && r.bpm <= 250 && !Number.isNaN(Date.parse(r.time));
}

export function sortByTime(readings) {
  return [...readings].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

export function latest(readings) {
  const s = sortByTime(readings);
  return s.length ? s[s.length - 1] : null;
}

export function average(readings) {
  if (!readings.length) return null;
  return Math.round(readings.reduce((n, r) => n + r.bpm, 0) / readings.length);
}

export function lowest(readings) {
  return readings.length ? Math.min(...readings.map(r => r.bpm)) : null;
}

export function lastDays(readings, days, now = new Date()) {
  const cutoff = now.getTime() - days * 86400000;
  return readings.filter(r => Date.parse(r.time) >= cutoff);
}

// Share of readings in each zone (id 0 = below zone 1). Values sum to ~1.
export function zoneSplit(readings, max) {
  const counts = { 0: 0 };
  ZONES.forEach(z => (counts[z.id] = 0));
  for (const r of readings) {
    const z = zoneFor(r.bpm, max);
    counts[z ? z.id : 0]++;
  }
  const total = readings.length;
  const out = {};
  for (const k of Object.keys(counts)) out[k] = total ? counts[k] / total : 0;
  return out;
}

// Direction of change: compares average of the older half vs the newer half.
export function trend(readings, threshold = 3) {
  const s = sortByTime(readings);
  if (s.length < 4) return 'not enough data';
  const mid = Math.floor(s.length / 2);
  const diff = average(s.slice(mid)) - average(s.slice(0, mid));
  if (diff > threshold) return 'rising';
  if (diff < -threshold) return 'falling';
  return 'steady';
}
