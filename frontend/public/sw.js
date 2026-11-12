// FashionStore SaaS — PWA Service Worker (Network First con fallback offline)
const CACHE_NAME = 'fashionstore-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorar API backend, WebSocket y extensiones
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/health') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // Network First: Intentar siempre red primero, fallback a cache si falla (modo offline)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return (await caches.match('/')) || (await caches.match('/index.html'));
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
