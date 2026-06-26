const CACHE_NAME = 'c-mastery-v38';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './quiz-engine.js',
  './quiz-engine.css',
  './ds-visualizer.js',
  './ds-visualizer.css',
  './questions.json',
  './questions-data.js',
  './icon-192.png',
  './icon-512.png',
  './og-image.png',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500&family=Fira+Code&display=swap'
];

// Install event: Cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-First for HTML/JS/CSS/JSON, Cache-First for others
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isLocalAsset = url.origin === self.location.origin && 
    (url.pathname.endsWith('.html') || 
     url.pathname.endsWith('.js') || 
     url.pathname.endsWith('.css') || 
     url.pathname.endsWith('.json') ||
     url.pathname === '/');

  if (isLocalAsset) {
    // Network-First Strategy
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First Strategy
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  }
});
