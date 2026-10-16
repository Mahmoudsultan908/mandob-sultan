// مندوب سلطان — Service Worker v18 (خزنة المندوب بتتقرأ حية وقت كل مزامنة بدل كاش محلي ممكن يبقى قديم)
const CACHE = 'mandob-sultan-old-v1';   // 17/10: the old app kept here as a backup — its own cache name only
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-76.png',
  './icons/icon-120.png',
  './icons/icon-152.png',
  './icons/icon-180.png'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k.startsWith('mandob-sultan-old-')).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache first, then network
self.addEventListener('fetch', e => {
  // Skip non-GET and external requests (Telegram API etc)
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cached version immediately
      if (cached) {
        // Update cache in background (stale-while-revalidate)
        fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
        }).catch(() => {});
        return cached;
      }
      // Not cached — fetch from network and cache it
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback — always return app shell
        return caches.match('./index.html');
      });
    })
  );
});
