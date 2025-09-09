/**
 * Service Worker for Book-GPT PWA
 * 오프라인 지원 및 캐싱 기능 제공
 */

const CACHE_NAME = 'book-gpt-v1';
const STATIC_CACHE_NAME = 'book-gpt-static-v1';
const DYNAMIC_CACHE_NAME = 'book-gpt-dynamic-v1';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon-192.png',
  // Vite에서 생성되는 정적 파일들은 빌드 후 추가
];

// 동적으로 캐시할 리소스 패턴
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//,
  /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/i,
];

// 캐시하지 않을 URL 패턴
const SKIP_CACHE_PATTERNS = [
  /^https:\/\/api\./,
  /\/api\//,
  /\/auth\//,
  /\/socket\.io\//,
];

/**
 * Service Worker 설치
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Service Worker 활성화
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 이전 버전의 캐시 삭제
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('book-gpt-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * 네트워크 요청 가로채기
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 캐시를 건너뛸 패턴 확인
  if (SKIP_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return; // 기본 네트워크 요청으로 처리
  }
  
  // GET 요청만 캐시 처리
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(handleFetchRequest(request));
});

/**
 * 요청 처리 로직
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 정적 리소스 처리 (캐시 우선)
    if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
      return await handleStaticRequest(request);
    }
    
    // 2. 동적 리소스 처리 (네트워크 우선, 캐시 백업)
    if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      return await handleDynamicRequest(request);
    }
    
    // 3. 일반 요청 (네트워크 우선)
    return await handleNetworkFirst(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // 오프라인이거나 네트워크 오류 시 폴백
    return await handleOfflineFallback(request);
  }
}

/**
 * 정적 리소스 처리 (캐시 우선)
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 캐시에 없으면 네트워크에서 가져와서 캐시
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * 동적 리소스 처리 (네트워크 우선, 캐시 백업)
 */
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  try {
    // 네트워크에서 최신 버전 가져오기
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 성공하면 캐시 업데이트
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 네트워크 실패 시 캐시에서 반환
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * 일반 요청 처리 (네트워크 우선)
 */
async function handleNetworkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // 네트워크 실패 시 캐시 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * 오프라인 폴백 처리
 */
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // HTML 요청에 대한 오프라인 페이지
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const offlinePage = await cache.match('/');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // 이미지 요청에 대한 폴백
  if (request.headers.get('accept')?.includes('image/')) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const fallbackImage = await cache.match('/icon-192.png');
    if (fallbackImage) {
      return fallbackImage;
    }
  }
  
  // 기본 오프라인 응답
  return new Response(
    JSON.stringify({
      error: '오프라인 상태입니다. 인터넷 연결을 확인해주세요.',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * 백그라운드 동기화 처리
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

/**
 * 백그라운드 동기화 로직
 */
async function handleBackgroundSync() {
  try {
    // 저장된 오프라인 데이터 동기화
    console.log('[SW] Performing background sync...');
    
    // 여기에 오프라인 중 저장된 대화나 설정을 서버와 동기화하는 로직 추가
    // 예: IndexedDB에서 미동기화 데이터 가져와서 서버로 전송
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * 푸시 알림 처리
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Book-GPT에서 알림이 도착했습니다.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: '열기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Book-GPT', options)
  );
});

/**
 * 알림 클릭 처리
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // 앱 열기
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // 이미 열린 탭이 있으면 포커스
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 새 탭 열기
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

/**
 * 메시지 처리 (앱에서 SW로의 통신)
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});