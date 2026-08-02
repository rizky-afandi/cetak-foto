// NAIKKAN VERSI CACHE SETIAP KALI BAPAK MENGUBAH KODE / MENGEDIT HALAMAN HTML (misal dari v6 ke v7)
const CACHE_NAME = 'cetak-foto-v8'; 

// DAFTAR SEMUA FILE YANG DIPERLUKAN UNTUK OFFLINE (Termasuk file sub-halaman)
const urlsToCache = [
  './',
  './index.html',
  './pasfoto.html',
  './grid.html',
  './custom.html',
  './hitung.html',
  './polaroid.html',
  './css/style.css',
  './css/cropper.min.css',
  './js/app.js',
  './js/html2canvas.min.js',
  './js/jspdf.umd.min.js',
  './js/cropper.min.js',
  './192.png',
  './512.png'
];

// 1. Install & Unduh Semua Aset ke Cache Lokal
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Mendaftar & mengunduh aset baru ke cache:', CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // Paksa SW baru langsung aktif
});

// 2. Fetch Handling (Utamakan Cache Offline)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // Abaikan request internal ekspor gambar/blob/dataURL agar tidak macet
  if (url.startsWith('blob:') || url.startsWith('data:') || req.method !== 'GET') {
    return;
  }

  // UTAMAKAN CACHE (Cache-First) agar 100% lancar saat offline
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      // Jika file ada di cache PWA, gunakan cache lokal (Sangat Cepat & Offline Friendly)
      if (cachedResponse) {
        return cachedResponse;
      }
      // Jika file tidak ada di cache, baru ambil dari server/jaringan
      return fetch(req);
    })
  );
});

// 3. Bersihkan Seluruh Cache Versi Lama Saat SW Baru Aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache versi lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Langsung ambil alih kendali halaman
});
