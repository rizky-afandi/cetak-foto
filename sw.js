// Naikkan versi cache menjadi v9 agar PWA otomatis memperbarui cache di HP
const CACHE_NAME = 'cetak-foto-v9'; 

// DAFTAR LENGKAP SELURUH FILE APLIKASI (Termasuk Semua File di Folder JS)
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
  
  // SELURUH FILE JAVASCRIPT LENGKAP SESUAI FOLDER
  './js/app.js',
  './js/cropper.min.js',
  './js/editor.js',
  './js/export.js',
  './js/html2canvas.min.js',
  './js/jspdf.umd.min.js',
  './js/kalkulator.js',
  './js/workspace.js',
  
  // Ikon Aplikasi
  './LogoA.png',
  './LogoB.png'
];

// 1. Install & Simpan Semua File ke Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Mengunduh seluruh aset lengkap ke cache:', CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // Paksa Service Worker baru langsung aktif
});

// 2. Bersihkan Cache Versi Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Menghapus cache versi lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Langsung ambil alih kendali halaman
});

// 3. Fetch Handling (Strategi: Stale-While-Revalidate untuk Mode Offline Super Cepat)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // Abaikan request internal blob/dataURL/POST/PUT
  if (url.startsWith('blob:') || url.startsWith('data:') || req.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      // Ambil pembaruan dari jaringan di latar belakang secara otomatis
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

      // Tampilkan dari cache jika ada, atau gunakan fetch jika file baru
      return cachedResponse || fetchPromise;
    })
  );
});