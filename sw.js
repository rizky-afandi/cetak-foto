const CACHE_NAME = 'cetak-foto-v4'; // Naikkan versi cache
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './css/cropper.min.css',
  './js/app.js',
  './js/html2canvas.min.js',
  './js/jspdf.umd.min.js',
  './js/cropper.min.js',
  './192.png',
  './512.png'
];

// 1. Install Service Worker & Cache Aset
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Fetch Aset (DIPERBAIKI: Abaikan Blob, Data-URL, dan non-GET request)
self.addEventListener('fetch', (event) => {
  const reqUrl = event.request.url;

  // JANGAN cetat/intersepsi request internal ekspor gambar atau skema non-http
  if (
    reqUrl.startsWith('blob:') || 
    reqUrl.startsWith('data:') || 
    event.request.method !== 'GET'
  ) {
    return; // Serahkan langsung ke browser
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 3. Update Service Worker & Bersihkan Cache Lama
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
