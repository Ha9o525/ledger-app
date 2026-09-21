// Bump CACHE_NAME any time you change index.html (or any cached file) —
// otherwise the service worker keeps serving the old cached version forever.
const CACHE_NAME = 'ledger-cache-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      const fetchPromise = fetch(event.request)
        .then(function(response) {
          // Cache same-origin app files and cross-origin font files
          // (Google Fonts) as they're fetched, so they're available offline
          // from then on.
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function() {
          // Offline and not cached: for a navigation, fall back to the
          // cached app shell so the app still opens.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });

      // Cache-first: serve instantly from cache if we have it, and quietly
      // refresh the cache in the background for next time.
      return cached || fetchPromise;
    })
  );
});
