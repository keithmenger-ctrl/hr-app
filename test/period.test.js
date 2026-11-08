import test from 'node:test';
import assert from 'node:assert/strict';
import { periodWindow, periodLabel, inWindow, bucketFor, summarize, delta } from '../src/period.js';

const now = new Date(2026, 10, 8, 15, 30); // Nov 8 2026, local time
const at = (m, d, h = 12) => new Date(2026, m, d, h).toISOString();

test('weekly window is the 7 days ending today; offset -1 is the previous 7', () => {
  const w = periodWindow('weekly', 0, now);
  assert.equal(w.start.getDate(), 2); assert.equal(w.end.getDate(), 9);
  const p = periodWindow('weekly', -1, now);
  assert.equal(p.start.getDate(), 26); assert.equal(p.start.getMonth(), 9);
  assert.equal(p.end.getTime(), w.start.getTime());
});

test('labels', () => {
  assert.equal(periodLabel('daily', 0, now), 'Today');
  assert.equal(periodLabel('daily', -1, now), 'Yesterday');
  assert.match(periodLabel('weekly', 0, now), /Nov 2.*Nov 8/);
  assert.match(periodLabel('yearly', 0, now), /2025.*2026/);
});

test('inWindow includes start day, excludes the day after', () => {
  const rs = [{ bpm: 70, time: at(10, 2, 0) }, { bpm: 71, time: at(10, 8, 23) }, { bpm: 72, time: at(10, 9, 1) }, { bpm: 73, time: at(10, 1, 23) }];
  assert.deepEqual(inWindow(rs, periodWindow('weekly', 0, now)).map(r => r.bpm), [70, 71]);
});

test('buckets by % of max (low <70, moderate 70-79, high 80+)', () => {
  assert.equal(bucketFor(100, 200), 'low');
  assert.equal(bucketFor(140, 200), 'moderate');
  assert.equal(bucketFor(160, 200), 'high');
  assert.equal(bucketFor(100, null), null);
});

test('summarize', () => {
  const rs = [{ bpm: 60, time: at(10, 7) }, { bpm: 150, time: at(10, 7, 14) }, { bpm: 170, time: at(10, 8) }];
  const s = summarize(rs, 180);
  assert.deepEqual([s.count, s.avg, s.lowest, s.peak, s.days], [3, 127, 60, 170, 2]);
  assert.deepEqual(s.split, { low: 1, moderate: 0, high: 2 });
  assert.deepEqual([summarize([], 180).avg, summarize([], 180).count], [null, 0]);
});

test('delta handles missing', () => {
  assert.equal(delta(70, 65), 5); assert.equal(delta(null, 65), null); assert.equal(delta(70, null), null);
});
