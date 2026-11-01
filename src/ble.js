// Bluetooth heart rate strap support (standard Heart Rate Service, works with Polar, Garmin, Wahoo, etc.)
export const HR_SERVICE = 'heart_rate';
export const HR_CHARACTERISTIC = 'heart_rate_measurement';

// Parses the standard Heart Rate Measurement value (Bluetooth spec 0x2A37).
export function parseHeartRateMeasurement(view) {
  const flags = view.getUint8(0);
  const is16 = (flags & 0x01) !== 0;
  let i = 1;
  const bpm = is16 ? view.getUint16(i, true) : view.getUint8(i);
  i += is16 ? 2 : 1;
  const contactSupported = (flags & 0x04) !== 0;
  const contact = contactSupported ? (flags & 0x02) !== 0 : null; // null = unknown
  if (flags & 0x08) i += 2; // energy expended
  const rr = [];
  if (flags & 0x10) {
    for (; i + 1 < view.byteLength; i += 2) rr.push(Math.round((view.getUint16(i, true) / 1024) * 1000));
  }
  return { bpm, contact, rr };
}

export function bluetoothSupported(nav = globalThis.navigator) {
  return !!(nav && nav.bluetooth);
}

// Connects to a strap and calls onSample({bpm, contact, rr}). Returns { stop, name }.
export async function connectStrap(onSample, onDisconnect, nav = globalThis.navigator) {
  if (!bluetoothSupported(nav)) throw new Error('Bluetooth is not supported in this browser');
  const device = await nav.bluetooth.requestDevice({ filters: [{ services: [HR_SERVICE] }] });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(HR_SERVICE);
  const ch = await service.getCharacteristic(HR_CHARACTERISTIC);
  const handler = e => onSample(parseHeartRateMeasurement(e.target.value));
  ch.addEventListener('characteristicvaluechanged', handler);
  device.addEventListener('gattserverdisconnected', () => onDisconnect && onDisconnect());
  await ch.startNotifications();
  return {
    name: device.name || 'Heart rate strap',
    stop() {
      ch.removeEventListener('characteristicvaluechanged', handler);
      if (device.gatt.connected) device.gatt.disconnect();
    },
  };
}
