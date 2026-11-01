import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, addClient, addReading, removeClient, parseImport } from '../src/store.js';

test('add client and reading', () => {
  let s = addClient(emptyState(), { name: ' Sam ', age: 30 });
  assert.equal(s.clients[0].name, 'Sam');
  assert.equal(s.selected, s.clients[0].id);
  s = addReading(s, s.selected, { bpm: '72', time: '2026-11-01T08:00:00Z', note: ' rest ' });
  assert.equal(s.clients[0].readings[0].bpm, 72);
  assert.equal(s.clients[0].readings[0].note, 'rest');
});

test('rejects empty name and bad bpm', () => {
  assert.throws(() => addClient(emptyState(), { name: '  ' }));
  const s = addClient(emptyState(), { name: 'A', age: 30 });
  assert.throws(() => addReading(s, s.selected, { bpm: 5 }));
  assert.throws(() => addReading(s, s.selected, { bpm: 'abc' }));
});

test('removeClient reselects', () => {
  let s = addClient(emptyState(), { name: 'A' });
  s = addClient(s, { name: 'B' });
  const b = s.selected;
  s = removeClient(s, b);
  assert.equal(s.clients.length, 1);
  assert.equal(s.selected, s.clients[0].id);
});

test('parseImport validates', () => {
  assert.throws(() => parseImport('{"x":1}'));
  assert.equal(parseImport('{"clients":[]}').selected, null);
});
