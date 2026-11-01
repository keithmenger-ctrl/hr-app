import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHeartRateMeasurement, bluetoothSupported, connectStrap } from '../src/ble.js';

const dv = bytes => new DataView(new Uint8Array(bytes).buffer);

test('parses 8-bit bpm', () => {
  assert.deepEqual(parseHeartRateMeasurement(dv([0x00, 72])), { bpm: 72, contact: null, rr: [] });
});

test('parses 16-bit bpm', () => {
  assert.equal(parseHeartRateMeasurement(dv([0x01, 0x2c, 0x01])).bpm, 300);
});

test('parses sensor contact flags', () => {
  assert.equal(parseHeartRateMeasurement(dv([0x06, 70])).contact, true);
  assert.equal(parseHeartRateMeasurement(dv([0x04, 70])).contact, false);
});

test('parses RR intervals (1/1024 s -> ms) and skips energy field', () => {
  const r = parseHeartRateMeasurement(dv([0x18, 65, 0x10, 0x00, 0x00, 0x04, 0x00, 0x03]));
  assert.equal(r.bpm, 65);
  assert.deepEqual(r.rr, [1000, 750]);
});

test('bluetoothSupported / connectStrap without bluetooth', async () => {
  assert.equal(bluetoothSupported({}), false);
  await assert.rejects(connectStrap(() => {}, null, {}), /not supported/);
});

test('connectStrap streams samples from a fake strap', async () => {
  let listener;
  const ch = {
    addEventListener: (_, f) => (listener = f), removeEventListener() {}, startNotifications: async () => {},
  };
  let disconnected = false;
  const device = {
    name: 'Fake H10', gatt: { connected: true, disconnect() { disconnected = true; },
      connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }) },
    addEventListener() {},
  };
  const got = [];
  const conn = await connectStrap(s => got.push(s.bpm), null, { bluetooth: { requestDevice: async () => device } });
  listener({ target: { value: dv([0, 88]) } });
  assert.deepEqual(got, [88]);
  assert.equal(conn.name, 'Fake H10');
  conn.stop();
  assert.ok(disconnected);
});
