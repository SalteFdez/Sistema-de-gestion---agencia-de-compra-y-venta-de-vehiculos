// Minimal Service Worker (sin caché offline en v1 según diseño, solo para habilitar instalación PWA)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Passthrough a la red
  event.respondWith(fetch(event.request));
});
