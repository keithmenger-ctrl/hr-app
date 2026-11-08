import test from 'node:test';
import assert from 'node:assert/strict';
import { caloriesPerMinute } from '../src/live.js';

test('calories per minute (male, 150 bpm, 176.37 lb, age 30) is about 14.7', () => {
  const v = caloriesPerMinute({ bpm: 150, age: 30, weightLb: 176.37, sex: 'male' });
  assert.ok(Math.abs(v - 14.7) < 0.1, String(v));
});
test('female formula and floor at zero', () => {
  assert.ok(caloriesPerMinute({ bpm: 140, age: 35, weightLb: 140, sex: 'female' }) > 5);
  assert.equal(caloriesPerMinute({ bpm: 30, age: 80, weightLb: 100, sex: 'female' }), 0);
});
test('returns null when profile is incomplete', () => {
  assert.equal(caloriesPerMinute({ bpm: 120, age: 30, weightLb: null, sex: 'male' }), null);
  assert.equal(caloriesPerMinute({ bpm: 120, age: 30, weightLb: 150, sex: null }), null);
});
