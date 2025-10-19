const CACHE_NAME = 'manseryeok-FIXED-v1.25.10.57';
const urlsToCache = [
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  console.log('[SW] Installing new service worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching manifest...');
      return cache.addAll(urlsToCache).catch(() => {
        return cache.addAll(['/manifest.json']);
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating new service worker...');
  event.waitUntil(
    Promise.all([
      // 모든 오래된 캐시 삭제
      caches.keys().then(function(cacheNames) {
        console.log('[SW] Deleting old caches:', cacheNames.filter(n => n !== CACHE_NAME));
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 클라이언트에게 강제 리로드 명령
      self.clients.matchAll({ type: 'window' }).then(function(clients) {
        console.log('[SW] Reloading all clients:', clients.length);
        clients.forEach(function(client) {
          client.postMessage({ type: 'FORCE_RELOAD' });
        });
      })
    ])
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return;
  }
  
  // API 요청은 항상 네트워크만 사용
  if (event.request.url.indexOf('/api/') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // HTML과 JS는 NETWORK-FIRST 전략 (항상 최신 버전 가져오기)
  const isHtmlOrScript = event.request.url.match(/\/$|\.html$|\.js$|\.ts$|\.jsx$|\.tsx$/);
  
  if (isHtmlOrScript) {
    console.log('[SW] Network-first for:', event.request.url);
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // 네트워크 성공: 응답 반환 (캐시 안 함)
          if (response && response.status === 200) {
            console.log('[SW] Network success:', event.request.url);
            return response;
          }
          return response;
        })
        .catch(function(error) {
          // 네트워크 실패: 캐시 폴백
          console.log('[SW] Network failed, trying cache:', event.request.url);
          return caches.match(event.request).then(function(cachedResponse) {
            if (cachedResponse) {
              console.log('[SW] Cache hit:', event.request.url);
              return cachedResponse;
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
    return;
  }
  
  // CSS, 이미지, 폰트 등 정적 리소스는 캐시 우선
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        // CSS, 이미지 등만 캐싱
        if (event.request.url.indexOf('http') === 0 && 
            event.request.url.indexOf('/api/') === -1) {
          var responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      }).catch(function() {
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

// 메시지 리스너 추가 (클라이언트에서 강제 업데이트 요청 시)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
});
