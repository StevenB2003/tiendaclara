// TiendaClara - service worker: caché de la aplicación para funcionar sin conexión.
const VERSION = 'tiendaclara-v1.0.0';
const ARCHIVOS = ['./', './index.html', './css/styles.css', './js/app.js', './js/db.js', './js/calc.js', './js/demo.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Estrategia: primero caché, luego red (y actualiza la caché en segundo plano).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(enCache => {
    const red = fetch(e.request).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(e.request, r.clone())); return r; }).catch(() => enCache);
    return enCache || red;
  }));
});
