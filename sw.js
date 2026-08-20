const CACHE = 'odeme-takip-v3';
const BASE = self.registration.scope;
const FILES = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}assets/fontawesome/css/all.min.css`,
  `${BASE}assets/fontawesome/webfonts/fa-solid-900.woff2`,
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
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match(`${BASE}index.html`)))
  );
});
