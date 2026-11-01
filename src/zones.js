export const ZONES = [
  { id: 1, name: 'Very light', min: 0.5, max: 0.6, color: '#7aa2f7' },
  { id: 2, name: 'Light', min: 0.6, max: 0.7, color: '#4cc38a' },
  { id: 3, name: 'Moderate', min: 0.7, max: 0.8, color: '#e5c07b' },
  { id: 4, name: 'Hard', min: 0.8, max: 0.9, color: '#f0883e' },
  { id: 5, name: 'Maximum', min: 0.9, max: 1.0, color: '#e5534b' },
];

export function maxHr({ age, maxHr: custom } = {}) {
  if (Number.isFinite(custom) && custom > 0) return Math.round(custom);
  if (Number.isFinite(age) && age > 0 && age < 120) return Math.round(220 - age);
  return null;
}

// Returns zone object, or null when below Zone 1 (resting/very low).
// Readings above max are treated as Zone 5.
export function zoneFor(bpm, max) {
  if (!Number.isFinite(bpm) || !Number.isFinite(max) || max <= 0) return null;
  const pct = bpm / max;
  if (pct < ZONES[0].min) return null;
  for (const z of ZONES) if (pct < z.max) return z;
  return ZONES[ZONES.length - 1];
}

export function zoneRanges(max) {
  return ZONES.map(z => ({ ...z, from: Math.round(z.min * max), to: Math.round(z.max * max) }));
}
