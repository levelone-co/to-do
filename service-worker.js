const CACHE_NAME = 'todo-app-v3';
const URLS_TO_CACHE = [
  './',
  './todo.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first for API calls, cache-first for static assets
  const url = event.request.url;
  if (url.includes('script.google.com') || url.includes('api.anthropic.com')) {
    // Network only for API calls
    event.respondWith(fetch(event.request));
  } else {
    // Cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return resp;
        }))
    );
  }
});
