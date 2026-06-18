/* ============================================================================
   LOO V2 Driver — Service Worker (PWA basic)
   หน้าที่: cache app shell + offline fallback
   กลยุทธ์:
     - navigate/HTML → network-first (ได้ของใหม่เมื่อมีเน็ต · fallback cache เมื่อ offline)
     - asset อื่น (CDN leaflet ฯลฯ) → cache-first (เร็ว · ประหยัดเน็ตคนขับ)
   หมายเหตุ: นี่คือ demo SW · production ค่อยเพิ่ม versioning/precache list เต็ม
   ============================================================================ */
const CACHE = 'loo-driver-v2';
const SHELL = ['./', './app.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))   // ห้ามล้ม install ถ้า asset ใด fetch ไม่ได้
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                    // POST/อื่น → ปล่อยผ่าน

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // network-first สำหรับหน้า → offline fallback = cache (app.html)
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('./app.html')))
    );
    return;
  }

  // asset อื่น → cache-first
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
