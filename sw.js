const CACHE = 'odeme-takip-v30';
const BASE = self.registration.scope;
const FILES = [
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
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Sayfa gezinmelerinde önce ağı kullan. Böylece yeni yayınlar eski HTML
  // önbelleğine takılmaz; bağlantı yoksa son başarılı sürüm açılır.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) return response;
          const kopya = response.clone();
          return caches.open(CACHE)
            .then(cache => cache.put(`${BASE}index.html`, kopya))
            .then(() => response);
        })
        .catch(() => caches.match(`${BASE}index.html`))
    );
    return;
  }

  if (url.pathname.endsWith('/rates.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) return response;
          const kopya = response.clone();
          return caches.open(CACHE)
            .then(cache => cache.put(e.request, kopya))
            .then(() => response);
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Uygulama kabuğunu hızlı aç, dosyanın güncel sürümünü arka planda yenile.
  const agIstegi = fetch(e.request)
    .then(response => {
      if (response.ok) {
        const kopya = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, kopya));
      }
      return response;
    });

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(onbellek => onbellek || agIstegi)
      .catch(() => agIstegi.catch(() => Response.error()))
  );
  e.waitUntil(agIstegi.catch(() => undefined));
});
