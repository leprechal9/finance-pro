const CACHE_NAME = 'finance-v50'; // Mude para v9!
const ASSETS = ['/', '/index.html', '/style.css', '/main.js', '/manifest.json'];

self.addEventListener('install', event => {
  // Removi o skipWaiting daqui para ele dar tempo do main.js perceber a mudança
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(res => res || fetch(event.request)));
});

