import { connectStrap } from './ble.js';
import { maxHr, zoneFor } from './zones.js';
import { caloriesPerMinute } from './live.js';

// A live group workout: several clients, each with their own chest strap.
// Tapping a person's tile pairs whichever strap you pick to THAT person.
export class Workout {
  constructor(clients, opts = {}) {
    this.connect = opts.connect || connectStrap;
    this.now = opts.now || Date.now;
    this.staleMs = opts.staleMs ?? 10000;       // no heartbeat for this long -> show "--"
    this.saveEveryMs = opts.saveEveryMs ?? 30000; // save a reading to the profile this often
    this.onChange = opts.onChange || (() => {});
    this.onReading = opts.onReading || (() => {});
    this.startedAt = this.now();
    this.p = new Map(clients.map(c => [c.id, {
      client: c, status: 'idle', bpm: null, lastSeen: 0, contact: null, strapName: null,
      kcal: 0, lastSample: 0, lastSaved: 0, conn: null, manual: false, error: '',
    }]));
  }

  async connectParticipant(id) {
    const p = this.p.get(id);
    if (!p || p.status === 'connecting' || p.status === 'live') return;
    p.status = 'connecting'; p.error = ''; p.manual = false;
    this.onChange();
    try {
      p.conn = await this.connect(s => this.handleSample(id, s), () => {
        p.status = p.manual ? 'idle' : 'lost'; p.conn = null; this.onChange();
      });
      p.strapName = p.conn.name;
      p.status = 'live';
    } catch (e) {
      p.status = 'idle';
      p.error = e && e.name === 'NotFoundError' ? '' : (e && e.message) || 'Could not connect';
    }
    this.onChange();
  }

  disconnectParticipant(id) {
    const p = this.p.get(id);
    if (!p) return;
    p.manual = true;
    if (p.conn) p.conn.stop();
    p.conn = null; p.status = 'idle'; p.bpm = null; p.strapName = null;
    this.onChange();
  }

  handleSample(id, s) {
    const p = this.p.get(id);
    if (!p || !s || !Number.isFinite(s.bpm) || s.bpm < 20 || s.bpm > 250) return;
    const t = this.now();
    p.contact = s.contact; p.bpm = s.bpm; p.lastSeen = t;
    const c = p.client;
    const cpm = caloriesPerMinute({ bpm: s.bpm, age: c.age, weightLb: c.weightLb, sex: c.sex });
    if (cpm != null && p.lastSample) p.kcal += (cpm * Math.min(t - p.lastSample, 5000)) / 60000;
    p.lastSample = t;
    if (s.contact !== false && t - p.lastSaved >= this.saveEveryMs) {
      p.lastSaved = t;
      this.onReading(id, s.bpm, new Date(t).toISOString());
    }
    this.onChange();
  }

  snapshot() {
    const t = this.now();
    return [...this.p.entries()].map(([id, p]) => {
      const max = maxHr(p.client);
      const fresh = p.bpm != null && t - p.lastSeen <= this.staleMs;
      const bpm = fresh ? p.bpm : null;
      const zone = bpm && max ? zoneFor(bpm, max) : null;
      return {
        id, name: p.client.name, status: p.status, bpm, max,
        pct: bpm && max ? Math.round((bpm / max) * 100) : null,
        zone, zoneId: bpm && max ? (zone ? zone.id : 0) : null,
        kcal: Math.round(p.kcal), strapName: p.strapName, contact: p.contact, error: p.error,
      };
    });
  }

  liveCount() { return this.snapshot().filter(x => x.bpm != null).length; }

  stopAll() { for (const id of this.p.keys()) this.disconnectParticipant(id); }
}
