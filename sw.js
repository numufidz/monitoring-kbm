// Service Worker — E-Jadwal KBM MTs. An-Nur Bululawang
// Versi cache: update angka ini setiap kali ada perubahan file
const CACHE_NAME = 'ejadwal-kbm-v1';

// Aset statis yang di-cache saat SW pertama diinstall
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json',
  '/icon.png',
  '/logo.png',
  '/banner.png'
];

// ─── Install: cache semua aset statis ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Langsung aktif tanpa menunggu tab lama ditutup
      return self.skipWaiting();
    })
  );
});

// ─── Activate: hapus cache lama ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch: strategi Cache First untuk aset, Network First untuk API ─────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Biarkan request ke API eksternal (opensheet.elk.sh, whatsapp, dll.) lewat tanpa intercept
  // SW hanya menangani aset statis dari origin sendiri
  if (url.origin !== self.location.origin) {
    // Untuk API request: coba network, tidak ada fallback (handled di script.js)
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  // Untuk aset lokal: Cache First → fallback ke network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Aset ditemukan di cache, kembalikan langsung
        return cachedResponse;
      }

      // Tidak ada di cache, ambil dari network dan simpan
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Jika gagal dan tidak ada di cache, kembalikan offline placeholder
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
