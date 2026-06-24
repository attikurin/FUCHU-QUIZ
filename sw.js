/* ===========================================
   府中ものしりクイズ - Service Worker
   オフライン対応・キャッシュ管理
   =========================================== */

const CACHE_VERSION = 'fuchu-quiz-v3.3.3';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './assets/keyapi-wave.webp',
  './assets/keyapi-happy.webp',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// インストール時：必要なファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時：キャッシュ優先（ネットワークフォールバック）
self.addEventListener('fetch', (event) => {
  // GETリクエストのみ対象
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // ネットワークから取得を試みる
        return fetch(event.request)
          .then((response) => {
            // 成功した場合のみキャッシュに追加（同一オリジンのみ）
            if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
              const responseClone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // ネットワーク失敗時：フォールバックでindex.htmlを返す（SPAの場合）
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
