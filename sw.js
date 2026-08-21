const CACHE = 'odeme-takip-v7';
const BASE = self.registration.scope;
const FILES = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}assets/fontawesome/css/all.min.css`,
  `${BASE}assets/fontawesome/webfonts/fa-solid-900.woff2`,
  `${BASE}rates.json`,
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('/rates.json')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() =>
      e.request.mode === 'navigate' ? caches.match(`${BASE}index.html`) : Response.error()
    ))
  );
});
