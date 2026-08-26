const CACHE = 'every-cent-v2-phase6-auth-runtime-v1';
const STATIC_ASSETS = [
  '/styles.css',
  '/app.js',
  '/phase2-data-runtime.js',
  '/phase2-subscriptions-savings-runtime.js',
  '/styles.css?v=phase3-seven-view-runtime-v3',
  '/app.js?v=phase3-seven-view-runtime-v3',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Authentication and authenticated API requests must never be answered from cache.
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;

  // Navigation is network-only from Phase 6 onward. Never fall back to a cached
  // pre-authentication index.html because that could expose the old Budget shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => new Response(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Secure connection required</title></head><body><main><h1>Secure connection required</h1><p>Connect to the internet so GENEVIEVE Budget can verify your session before opening your money screens.</p></main></body></html>',
        {
          status: 503,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
          },
        }
      ))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (!response.ok) return response;
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(response => response || new Response('Offline', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    })))
  );
});
