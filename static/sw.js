/* Simple service worker for SA System PWA */
const CACHE_NAME = 'sa-system-v1';
const PRECACHE_URLS = [
  '/',
  '/static/css/base.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/css/sidebar.css',
  '/static/js/main.js',
  '/static/images/tech-256x256.png',
  '/static/images/tech-512x512.png',
  '/static/offline.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // only handle GET requests
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        // don't cache opaque responses (cross-origin) to avoid filling cache
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => {
          try { cache.put(event.request, respClone); } catch (e) { }
        });
        return resp;
      }).catch(() => {
        // fallback for navigation requests: serve cached offline page
        if (event.request.mode === 'navigate') return caches.match('/static/offline.html');
        return caches.match('/static/images/tech-256x256.png');
      });
    })
  );
});
