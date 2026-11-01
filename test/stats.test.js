import test from 'node:test';
import assert from 'node:assert/strict';
import { average, lowest, latest, lastDays, zoneSplit, trend, validReading } from '../src/stats.js';

const r = (bpm, time) => ({ bpm, time });
const data = [
  r(60, '2026-10-25T08:00:00Z'), r(70, '2026-10-28T08:00:00Z'),
  r(120, '2026-10-30T08:00:00Z'), r(150, '2026-11-01T08:00:00Z'),
];

test('basic stats', () => {
  assert.equal(average(data), 100);
  assert.equal(lowest(data), 60);
  assert.equal(latest(data).bpm, 150);
  assert.equal(average([]), null);
  assert.equal(lowest([]), null);
  assert.equal(latest([]), null);
});

test('lastDays filters by window', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  assert.equal(lastDays(data, 7, now).length, 3);
  assert.equal(lastDays(data, 1, now).length, 1);
});

test('zoneSplit sums to 1 and counts below-zone readings', () => {
  const s = zoneSplit(data, 180); // 60,70 <90 -> 0 ; 120 -> z2 ; 150 -> z4
  assert.equal(s[0], 0.5);
  assert.equal(s[2], 0.25);
  assert.equal(s[4], 0.25);
  assert.equal(zoneSplit([], 180)[0], 0);
});

test('trend detects direction', () => {
  assert.equal(trend(data), 'rising');
  assert.equal(trend([...data].reverse().map((x, i) => r(x.bpm, data[i].time))), 'falling');
  assert.equal(trend([r(70, '2026-10-01T00:00:00Z'), r(71, '2026-10-02T00:00:00Z'), r(70, '2026-10-03T00:00:00Z'), r(71, '2026-10-04T00:00:00Z')]), 'steady');
  assert.equal(trend(data.slice(0, 2)), 'not enough data');
});

test('validReading rejects bad input', () => {
  assert.ok(validReading(r(72, '2026-11-01T00:00:00Z')));
  assert.ok(!validReading(r(10, '2026-11-01T00:00:00Z')));
  assert.ok(!validReading(r(300, '2026-11-01T00:00:00Z')));
  assert.ok(!validReading(r(72, 'nope')));
});
