/* KOY Studio service worker: caches the app so it opens fast and works without signal.
   Bump VERSION on every release so phones pick up the new files. */
const VERSION = 'koy-studio-v1.1.0';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'js/render.js', 'js/app.js', 'manifest.webmanifest',
  'fonts/fonts.css', 'fonts/Assistant-hebrew.woff2', 'fonts/Assistant-latin.woff2', 'fonts/JosefinSans-Regular.ttf',
  'assets/logo.svg', 'assets/logo-dark.svg', 'assets/sun.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
