const CACHE = 'hr-app-v4';
const FILES = ['./', 'index.html', 'app.js', 'style.css', 'src/zones.js', 'src/stats.js', 'src/store.js', 'src/ble.js', 'src/live.js', 'src/period.js', 'src/workout.js', 'src/util.js', 'workout-ui.js', 'icons/icon-192.png', 'icons/mps-logo.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// network first so updates show up; cache as offline fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
