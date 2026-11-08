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

## v2 – Group workouts (approved by Keith)
- Client profiles: name, age, max HR (optional), weight (lb) and sex (optional, used only for calorie estimates). Editable.
- Any standard Bluetooth chest strap works. In a workout, tapping a person's tile pairs the strap you pick to THAT person.
- Workout screen styled like a MyZone wall: one tile per person with % of max HR, bpm, calories, strap name.
  Colors by % of max: grey 50–59, blue 60–69, green 70–79, yellow 80–89, red 90+ (dark = below 50 / no signal).
- Readings during a workout are saved to each profile about every 30 s. Screen stays awake; Full screen button for a TV.
- Limit to know: one phone/tablet/computer can hold only a limited number of Bluetooth connections at once (often ~7–10 on phones, more on a computer with a good adapter). Test with the real class size.

## Later
- Link client profiles to Keith's KM Trainer / MPS app.
- Workout summary after class, points/"effort" score like MyZone, saved workout history, shared accounts/sync.

## v3 – Morpheus-style layout + MPS brand (requested by Keith)
- Layout copied from the Morpheus app (everything except the Learn tab): header, Daily/Weekly/Monthly/Yearly tabs with date arrows,
  stat cards with change vs the previous period, workouts card (Low/Moderate/High donut + trend chart + full list),
  bottom bar Home / Challenges / TRAIN (center) / Menu, and a Menu with profile header and grouped rows.
- Colors and font from the MPS Brand Kit in Notion (Pipeline page): Mineral Blue #356784, Soft Black #12100F,
  Warm Carbon #1C1815, Sandstone Beige #D6C2AB, Bone White #F4EEE5; font Manrope. Light (Bone White) background, no dark mode.
- TRAIN = group workout. The live wall now uses the MPS look too (Bone page, Soft Black text, zone-colored tiles, MPS logo); Keith asked for this.
- Not copied on purpose: Learn tab / Learning center, HRV, Steps and Sleep cards (no data source for them here).
- Challenges tab removed (Keith).
- Logo and app icon: the MPS KM mark, taken from the MPS app repo (KMTrainer-Web: splash-logo.png, icon-512-v2.png). Page color #EFE7DB, ink #1C1815, accent #356784 / #2A5269 match that app's stylesheet.
