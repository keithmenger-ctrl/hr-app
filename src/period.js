import { zoneFor } from './zones.js';

// Morpheus-style periods: rolling windows ending at the end of "today" (shifted by offset periods).
export const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

export function periodWindow(kind, offset = 0, now = new Date()) {
  const days = PERIOD_DAYS[kind];
  const end = new Date(now); end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1 + offset * days);          // exclusive end (midnight after the last day)
  const start = new Date(end); start.setDate(start.getDate() - days);
  return { start, end, days };
}

export function periodLabel(kind, offset = 0, now = new Date()) {
  const { start, end } = periodWindow(kind, offset, now);
  const last = new Date(end); last.setDate(last.getDate() - 1);
  const f = (d, y) => d.toLocaleDateString([], { month: 'short', day: 'numeric', ...(y ? { year: 'numeric' } : {}) });
  if (kind === 'daily') return offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : f(last, true);
  return `${f(start, kind === 'yearly')} – ${f(last, kind === 'yearly')}`;
}

export function inWindow(readings, w) {
  return readings.filter(r => { const t = Date.parse(r.time); return t >= w.start.getTime() && t < w.end.getTime(); });
}

// Low < 70% of max, Moderate 70–79%, High 80%+.
export function bucketFor(bpm, max) {
  if (!max) return null;
  const pct = bpm / max;
  return pct >= 0.8 ? 'high' : pct >= 0.7 ? 'moderate' : 'low';
}

export function summarize(readings, max) {
  const count = readings.length;
  const bpms = readings.map(r => r.bpm);
  const split = { low: 0, moderate: 0, high: 0 };
  for (const r of readings) { const b = bucketFor(r.bpm, max); if (b) split[b]++; }
  const days = new Set(readings.map(r => new Date(r.time).toDateString())).size;
  return {
    count, days, split,
    avg: count ? Math.round(bpms.reduce((a, b) => a + b, 0) / count) : null,
    lowest: count ? Math.min(...bpms) : null,
    peak: count ? Math.max(...bpms) : null,
    avgZone: count && max ? zoneFor(Math.round(bpms.reduce((a, b) => a + b, 0) / count), max) : null,
  };
}

export function delta(current, previous) {
  return current == null || previous == null ? null : current - previous;
}
