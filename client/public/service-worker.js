const CACHE_NAME = 'manseryeok-v1.25.10.39';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // 기본 리소스 캐싱
        return cache.addAll(urlsToCache).catch(() => {
          return cache.addAll(['/manifest.json']);
        });
      })
      .then(function() {
        // 메인 페이지를 fetch해서 참조하는 모든 리소스 캐싱
        return fetch('/').then(function(response) {
          if (!response.ok) return;
          
          return response.text().then(function(html) {
            return caches.open(CACHE_NAME).then(function(cache) {
              // HTML 자체를 캐싱
              const htmlCachePromise = cache.put('/', new Response(html, {
                headers: { 'Content-Type': 'text/html' }
              }));
              
              // HTML에서 참조하는 JS/CSS 리소스 추출
              const scriptMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["']/g);
              const linkMatches = html.matchAll(/<link[^>]+href=["']([^"']+)["']/g);
              
              const resourceUrls = [];
              for (const match of scriptMatches) {
                resourceUrls.push(match[1]);
              }
              for (const match of linkMatches) {
                const href = match[1];
                if (href.endsWith('.css') || href.includes('/assets/')) {
                  resourceUrls.push(href);
                }
              }
              
              // 리소스들을 fetch하고 캐싱하는 Promise 배열
              const resourcePromises = resourceUrls.map(function(url) {
                return fetch(url).then(function(res) {
                  if (res.ok) {
                    return cache.put(url, res.clone());
                  }
                }).catch(function(err) {
                  console.log('Failed to cache resource:', url, err);
                });
              });
              
              // HTML과 모든 리소스 캐싱이 완료될 때까지 대기
              return Promise.all([htmlCachePromise, ...resourcePromises]);
            });
          });
        }).catch(function(err) {
          console.log('Failed to precache resources:', err);
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
  
  // HTML과 JS는 캐시 우선 전략 (오프라인 실행 지원)
  const isHtmlOrScript = event.request.url.match(/\/$|\.html$|\.js$|\.ts$|\.jsx$|\.tsx$/);
  
  if (isHtmlOrScript) {
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse) {
        // 캐시가 있으면 즉시 반환하고, 백그라운드에서 업데이트
        if (cachedResponse) {
          // 백그라운드에서 최신 버전 가져오기
          fetch(event.request).then(function(response) {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        // 캐시가 없으면 네트워크에서 가져오기
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(function() {
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
    return;
  }
  
  // 정적 리소스만 캐시 전략 사용 (CSS, 이미지, 폰트 등)
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
            
            // 정적 리소스만 캐시 (CSS, 이미지, 폰트 등)
            if (event.request.url.indexOf('http') === 0 && 
                event.request.url.indexOf('/api/') === -1) {
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