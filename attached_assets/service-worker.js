const CACHE_NAME = 'manseryeok-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/attached_assets/만세력로고_1758875108140.png',
  '/attached_assets/바탕로고png_1759021446229.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Cache install error:', err);
          return cache.addAll(['/manifest.json']);
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(function(response) {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            if (event.request.url.indexOf('http') === 0) {
              var responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch(function() {
            return caches.match(event.request);
          });
      })
  );
});