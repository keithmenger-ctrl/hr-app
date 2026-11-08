import { validReading } from './stats.js';

export function emptyState() { return { clients: [], selected: null }; }

export function addClient(state, { name, age, maxHr, weightLb, sex }) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Name is required');
  const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const client = { id, name: clean, age: age ?? null, maxHr: maxHr ?? null, weightLb: weightLb ?? null, sex: sex || null, readings: [] };
  return { clients: [...state.clients, client], selected: id };
}

export function updateClient(state, clientId, { name, age, maxHr, weightLb, sex }) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Name is required');
  return {
    ...state,
    clients: state.clients.map(c => (c.id === clientId
      ? { ...c, name: clean, age: age ?? null, maxHr: maxHr ?? null, weightLb: weightLb ?? null, sex: sex || null }
      : c)),
  };
}

export function addReading(state, clientId, { bpm, time, note }) {
  const reading = { bpm: Number(bpm), time: time || new Date().toISOString(), note: (note || '').trim() };
  if (!validReading(reading)) throw new Error('Enter a heart rate between 20 and 250');
  return {
    ...state,
    clients: state.clients.map(c => (c.id === clientId ? { ...c, readings: [...c.readings, reading] } : c)),
  };
}

export function removeClient(state, clientId) {
  const clients = state.clients.filter(c => c.id !== clientId);
  const selected = state.selected === clientId ? (clients[0]?.id ?? null) : state.selected;
  return { clients, selected };
}

export function parseImport(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.clients)) throw new Error('Not a valid backup file');
  return { clients: data.clients, selected: data.selected ?? data.clients[0]?.id ?? null };
}
