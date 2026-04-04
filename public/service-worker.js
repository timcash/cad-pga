const CACHE_VERSION = 'cad-pga-pwa-v8';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  './',
  './index.html',
  './mesh-cleanup/',
  './mesh-cleanup/index.html',
  './mesh-cleanup/readme/',
  './mesh-cleanup/readme/index.html',
  './cnc-kernel-simulator/',
  './cnc-kernel-simulator/index.html',
  './cnc-kernel-simulator/readme/',
  './cnc-kernel-simulator/readme/index.html',
  './gear-rotation-linkage/',
  './gear-rotation-linkage/index.html',
  './gear-rotation-linkage/readme/',
  './gear-rotation-linkage/readme/index.html',
  './meshless-fea-wos/',
  './meshless-fea-wos/index.html',
  './meshless-fea-wos/readme/',
  './meshless-fea-wos/readme/index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './pwa-192.png',
  './pwa-512.png',
  './pwa-maskable-192.png',
  './pwa-maskable-512.png',
  './demo-shell.css',
  './demo-runtime.js',
  './vendor/ganja.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS.map((path) => toScopedUrl(path))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !cacheName.startsWith(CACHE_VERSION))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isCacheableAssetRequest(request)) {
    event.respondWith(handleRuntimeAssetRequest(request));
  }
});

async function handleNavigationRequest(request) {
  const shellCache = await caches.open(APP_SHELL_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      shellCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    const cachedShell = await shellCache.match(toScopedUrl('./'));
    if (cachedShell) {
      return cachedShell;
    }

    throw new Error('Offline and no cached app shell is available.');
  }
}

async function handleRuntimeAssetRequest(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await caches.match(request);

  if (request.destination === 'script' || request.destination === 'style') {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        runtimeCache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      if (cachedResponse) {
        return cachedResponse;
      }
      throw new Error('Runtime asset unavailable.');
    }
  }

  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        runtimeCache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

function isCacheableAssetRequest(request) {
  return ['script', 'style', 'image', 'font'].includes(request.destination) || request.url.endsWith('.webmanifest');
}

function toScopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}
