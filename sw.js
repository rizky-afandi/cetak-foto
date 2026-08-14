// file: sw.js
const CACHE_NAME = 'cetak-foto-v11'; 

// DAFTAR LENGKAP FILE APLIKASI
const urlsToCache = [
  './',
  './index.html',
  './pasfoto.html',
  './grid.html',
  './custom.html',
  './hitung.html',
  './polaroid.html',
  './printgambar.html',
  './manifest.json',
  
  // CSS
  './css/style.css',
  './css/cropper.min.css',
  
  // JS
  './js/app.js',
  './js/cropper.min.js',
  './js/editor.js',
  './js/export.js',
  './js/html2canvas.min.js',
  './js/jspdf.umd.min.js',
  './js/kalkulator.js',
  './js/workspace.js',
  
  // Ikon Aplikasi (Disesuaikan dengan file di folder root)
  './LogoA.png',
  './LogoB.png'
];

// 1. Install & Simpan Semua File ke Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Mengunduh seluruh aset ke cache:', CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 2. Bersihkan Cache Versi Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch Handling (Mode Offline Super Cepat)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  if (url.startsWith('blob:') || url.startsWith('data:') || req.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('SW: Mode Offline Aktif:', err);
      });

      return cachedResponse || fetchPromise;
    })
  );
});
