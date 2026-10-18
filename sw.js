/* Kamera Çevirmeni PWA — Service Worker */
const CACHE = 'cevirmen-pwa-v5';
const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/franc-all@6.2.0/dist/franc-all.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Önbelleğe alınamadı:', url, err.message))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // MyMemory her zaman canlı
  if (url.hostname.includes('mymemory.translated.net')) return;

  // Tesseract / franc / tessdata › cache-first
  if (
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('tessdata') ||
    url.pathname.includes('/tessdata/') ||
    url.pathname.endsWith('.traineddata') ||
    url.pathname.endsWith('.traineddata.gz')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => new Response('Offline — model önbellekte yok', { status: 503 }));
      })
    );
    return;
  }

  // Kendi origin › cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkPromise = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return cached;
        });
        return cached || networkPromise;
      })
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});