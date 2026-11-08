import test from 'node:test';
import assert from 'node:assert/strict';
import { Workout } from '../src/workout.js';
import { updateClient, addClient, emptyState } from '../src/store.js';

const clients = [
  { id: 'a', name: 'Al', age: 40, weightLb: 180, sex: 'male' },   // max 180
  { id: 'b', name: 'Amy', age: 30 },                               // max 190
];
function fakeConnect() {
  const handles = {};
  const connect = async (onSample, onDisc) => {
    const h = { name: 'Strap' + Object.keys(handles).length, stopped: false, onSample, onDisc, stop() { this.stopped = true; this.onDisc(); } };
    handles[h.name] = h;
    return h;
  };
  return { connect, handles };
}

test('pairs a strap to the tapped person and shows % of max and zone', async () => {
  let t = 1000;
  const f = fakeConnect();
  const w = new Workout(clients, { connect: f.connect, now: () => t });
  await w.connectParticipant('a');
  f.handles.Strap0.onSample({ bpm: 158, contact: true });
  const a = w.snapshot().find(x => x.id === 'a');
  assert.equal(a.pct, 88);           // 158/180
  assert.equal(a.zoneId, 4);         // 80-90% = yellow
  assert.equal(a.strapName, 'Strap0');
  assert.equal(w.snapshot().find(x => x.id === 'b').bpm, null);
  assert.equal(w.liveCount(), 1);
});

test('stale readings blank out, below-zone reads as zone 0', async () => {
  let t = 0;
  const f = fakeConnect();
  const w = new Workout(clients, { connect: f.connect, now: () => t, staleMs: 10000 });
  await w.connectParticipant('a');
  f.handles.Strap0.onSample({ bpm: 80 });
  assert.equal(w.snapshot()[0].zoneId, 0);
  t = 11000;
  assert.equal(w.snapshot()[0].bpm, null);
});

test('accumulates calories only when profile is complete', async () => {
  let t = 0;
  const f = fakeConnect();
  const w = new Workout(clients, { connect: f.connect, now: () => t });
  await w.connectParticipant('a'); await w.connectParticipant('b');
  for (let i = 0; i < 60; i++) { t += 1000; f.handles.Strap0.onSample({ bpm: 150 }); f.handles.Strap1.onSample({ bpm: 150 }); }
  const [a, b] = w.snapshot();
  assert.ok(a.kcal > 8 && a.kcal < 20, String(a.kcal)); // ~1 minute at ~12-15 kcal/min
  assert.equal(b.kcal, 0);
});

test('saves a reading about every 30s, never without contact', async () => {
  let t = 100000; const saved = [];
  const f = fakeConnect();
  const w = new Workout(clients, { connect: f.connect, now: () => t, onReading: (id, bpm) => saved.push([id, bpm]) });
  await w.connectParticipant('a');
  const h = f.handles.Strap0;
  h.onSample({ bpm: 120, contact: false }); assert.equal(saved.length, 0);
  h.onSample({ bpm: 121, contact: true });  assert.equal(saved.length, 1);
  t += 10000; h.onSample({ bpm: 122, contact: true }); assert.equal(saved.length, 1);
  t += 25000; h.onSample({ bpm: 123, contact: true }); assert.equal(saved.length, 2);
});

test('ignores junk readings; disconnect marks lost, manual stop marks idle', async () => {
  const f = fakeConnect();
  const w = new Workout(clients, { connect: f.connect });
  await w.connectParticipant('a');
  f.handles.Strap0.onSample({ bpm: 400 });
  assert.equal(w.snapshot()[0].bpm, null);
  f.handles.Strap0.onDisc();
  assert.equal(w.snapshot()[0].status, 'lost');
  await w.connectParticipant('a');                 // reconnect works
  assert.equal(w.snapshot()[0].status, 'live');
  w.disconnectParticipant('a');
  assert.equal(w.snapshot()[0].status, 'idle');
});

test('cancelled strap picker leaves person idle with no error', async () => {
  const w = new Workout(clients, { connect: async () => { const e = new Error('x'); e.name = 'NotFoundError'; throw e; } });
  await w.connectParticipant('a');
  const a = w.snapshot()[0];
  assert.equal(a.status, 'idle'); assert.equal(a.error, '');
});

test('updateClient edits profile fields', () => {
  let s = addClient(emptyState(), { name: 'Sam', age: 30 });
  s = updateClient(s, s.selected, { name: 'Samuel', age: 31, weightLb: 170, sex: 'male', maxHr: null });
  assert.deepEqual([s.clients[0].name, s.clients[0].weightLb, s.clients[0].sex], ['Samuel', 170, 'male']);
  assert.throws(() => updateClient(s, s.selected, { name: ' ' }));
});
