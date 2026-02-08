const CACHE_NAME = 'finance-v50'; 
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js', // Corrigido de main.js para script.js
  './manifest.json',
  './version.txt'
];

self.addEventListener('install', event => {
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
  const url = event.request.url;
  // Se for uma busca de versão ou script com v=, vai direto pra rede
  if (url.includes('version.txt') || url.includes('?v=')) {
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
  }
});