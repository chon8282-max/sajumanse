const CACHE_NAME = 'manseryeok-v6-nocache';
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
        return cache.addAll(urlsToCache).catch(() => {
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
  
  // API 요청은 항상 네트워크로 가져오고 캐시하지 않음
  if (event.request.url.indexOf('/api/') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function() {
        // API 요청 실패 시 네트워크 에러 반환 (캐시 사용 안 함)
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // 정적 리소스만 캐시 전략 사용
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
            
            // JavaScript 제외하고 정적 리소스만 캐시 (HTML, CSS, 이미지 등)
            // JS 파일은 항상 최신 버전을 가져오도록 캐시하지 않음
            if (event.request.url.indexOf('http') === 0 && 
                event.request.url.indexOf('/api/') === -1 &&
                !event.request.url.match(/\.js$|\.ts$|\.jsx$|\.tsx$/)) {
              var responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch(function() {
            // 정적 리소스 네트워크 요청 실패 시만 캐시 폴백 시도
            return caches.match(event.request).then(function(response) {
              return response || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
          });
      })
  );
});