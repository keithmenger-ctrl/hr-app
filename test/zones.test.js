import test from 'node:test';
import assert from 'node:assert/strict';
import { maxHr, zoneFor, zoneRanges } from '../src/zones.js';

test('maxHr uses 220 - age, or custom value', () => {
  assert.equal(maxHr({ age: 40 }), 180);
  assert.equal(maxHr({ age: 40, maxHr: 190 }), 190);
  assert.equal(maxHr({}), null);
  assert.equal(maxHr({ age: 200 }), null);
});

test('zoneFor maps bpm to zones at the boundaries', () => {
  assert.equal(zoneFor(89, 180), null);      // < 50%
  assert.equal(zoneFor(90, 180).id, 1);      // 50%
  assert.equal(zoneFor(108, 180).id, 2);     // 60%
  assert.equal(zoneFor(143, 180).id, 3);
  assert.equal(zoneFor(144, 180).id, 4);     // 80%
  assert.equal(zoneFor(162, 180).id, 5);     // 90%
  assert.equal(zoneFor(190, 180).id, 5);     // above max
  assert.equal(zoneFor(100, null), null);
  assert.equal(zoneFor(NaN, 180), null);
});

test('zoneRanges gives bpm ranges', () => {
  const r = zoneRanges(200);
  assert.deepEqual([r[0].from, r[0].to], [100, 120]);
  assert.deepEqual([r[4].from, r[4].to], [180, 200]);
});
