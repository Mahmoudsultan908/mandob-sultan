// Sultan staff app (reps + «أنا») — service worker (17/10/2026), replacing the old rep app's worker at the same address:
//  * removes the old rep app's caches only (mandob-sultan-…; Sultanoo lives on the same site and keeps its own), then
//    reloads open windows once so a rep who had the old app open lands in the new one;
//  * pages: network first, the saved copy when there is no internet;
//  * the app's files (hashed names under assets/): saved once, served from the device;
//  * the server (another address) always goes to the network — sales, stock and money are never served from a copy.
const CACHE = 'rep-new-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter((k) => k !== CACHE && (k.startsWith('mandob-sultan-v') || k.startsWith('rep-new-')));
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    if (old.some((k) => k.startsWith('mandob-sultan-v'))) {
      const wins = await self.clients.matchAll({ type: 'window' });
      for (const w of wins) { try { await w.navigate(w.url); } catch (e) { /* next time */ } }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
      return res;
    }).catch(async () => (await caches.match('./index.html')) || new Response('مفيش نت', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
