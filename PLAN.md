# Heart Rate App – Plan (v1)

Approved by Keith to proceed with these defaults. Change anything by telling Keith's agent.

## Who / what
- Used by a trainer (Keith) and his training clients, mainly on a phone.
- Simple web app: no accounts, no server, no paid services. Data stays in the browser (localStorage).

## v1 features
1. Clients: add a client (name, age or custom max heart rate); switch between clients.
2. Heart rate zones: 5 standard zones as % of max heart rate (max = 220 − age unless set by hand).
3. Log readings: bpm, date/time, optional note. Each reading shows its zone.
4. Trends: latest reading + zone, 7-day average, lowest (resting estimate), time-in-zone split, line chart over time.
5. Export/import data as a JSON file (backup).

## Defaults assumed (easy to change)
- Zones: Z1 50–60%, Z2 60–70%, Z3 70–80%, Z4 80–90%, Z5 90–100% of max HR.
- Chest strap: connects over Bluetooth (standard heart rate straps: Polar, Garmin, Wahoo). Live bpm + zone, saves one reading every 30 s. Needs Chrome/Edge (Android or computer) or Bluefy on iPhone, and the site must be on https (or localhost). Plain iPhone Safari does not support it. Manual entry still works.

## Tech
- Plain HTML/CSS/JS (ES modules), no build step, no dependencies.
- Logic in `src/` (tested with `node --test`); UI in `index.html` + `app.js`.
- Run locally: `npm start` (serves on http://localhost:8080). Tests: `npm test`.

## Later / needs Keith's decision
- Publishing online (hosting), accounts/sync across devices, wearable integration.
