const CACHE_NAME = 'cetak-foto-v2';
const urlsToCache = [
  './index.html',
  './css/style.css',
  './css/cropper.min.css',     // Ditambahkan untuk offline CSS Cropper
  './js/app.js',
  './js/html2canvas.min.js',  // Ditambahkan untuk offline html2canvas
  './js/jspdf.umd.min.js',   // Ditambahkan untuk offline jsPDF
  './js/cropper.min.js',     // Ditambahkan untuk offline JS Cropper
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

// 2. Fetch Aset dari Cache saat Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Kembalikan dari cache jika ada, jika tidak ambil dari jaringan
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