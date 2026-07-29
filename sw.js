const CACHE_NAME = 'cetak-foto-pro-v3';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './192.png
    './512.png
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js'
];

// Install Service Worker & Simpan Cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Aktifkan & Bersihkan Cache Lama jika ada pembaruan
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Ambil data dari Cache saat offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Kembalikan file dari cache jika ada, jika tidak lakukan fetch jaringan
            return response || fetch(event.request);
        })
    );
});
