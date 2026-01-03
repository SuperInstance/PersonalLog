/**
 * PersonalLog Service Worker
 *
 * Implements caching strategies for:
 * - App shell (stale-while-revalidate)
 * - API responses (network-first)
 * - Static assets (cache-first)
 * - Offline fallback
 *
 * @module sw
 */

const CACHE_VERSION = 'v2'; // Increment for cache invalidation
const CACHE_NAME = `personallog-${CACHE_VERSION}`;

// Cache names for different strategies
const CACHE_NAMES = {
  shell: `${CACHE_NAME}-shell`,
  api: `${CACHE_NAME}-api`,
  assets: `${CACHE_NAME}-assets`,
  images: `${CACHE_NAME}-images`,
  embeddings: `${CACHE_NAME}-embeddings`,
};

// URLs to cache for app shell
const SHELL_URLS = [
  '/',
  '/messenger',
  '/longform',
  '/dashboard',
];

// API routes to cache
const API_PATTERNS = [
  /\/api\/conversations/, // Cache conversations
  /\/api\/knowledge/, // Cache knowledge entries
  /\/api\/modules/, // Cache modules
];

// API routes to NEVER cache (write operations)
const NO_CACHE_PATTERNS = [
  /\/api\/chat/, // Never cache chat responses
  /\/api\/.*\/(POST|PUT|PATCH|DELETE)/, // Never cache write operations
];

// Asset patterns
const ASSET_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
];

// Image patterns
const IMAGE_PATTERNS = [
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.webp$/,
  /\.ico$/,
];

/**
 * Install event - cache app shell
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(CACHE_NAMES.shell);

      // Cache shell URLs
      try {
        await shellCache.addAll(SHELL_URLS);
        console.log('[SW] App shell cached successfully');
      } catch (error) {
        console.warn('[SW] Failed to cache some shell URLs:', error);
      }

      // Force the waiting service worker to become active
      await self.skipWaiting();
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(
        (name) =>
          name.startsWith('personallog-') &&
          name !== CACHE_NAMES.shell &&
          name !== CACHE_NAMES.api &&
          name !== CACHE_NAMES.assets &&
          name !== CACHE_NAMES.images &&
          name !== CACHE_NAMES.embeddings
      );

      await Promise.all(
        oldCaches.map((name) => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );

      // Take control of all pages immediately
      await self.clients.claim();
    })()
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Check NO_CACHE patterns
  for (const pattern of NO_CACHE_PATTERNS) {
    if (pattern.test(url.pathname)) {
      return; // Don't cache, go to network directly
    }
  }

  // API routes - intelligent caching based on endpoint
  if (url.pathname.startsWith('/api/')) {
    // Models and contacts - cache first (rarely change)
    if (url.pathname.startsWith('/api/models')) {
      event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.api));
      return;
    }

    // Conversations - network first for freshness
    if (url.pathname.startsWith('/api/conversations')) {
      event.respondWith(networkFirst(request, CACHE_NAMES.api));
      return;
    }

    // Knowledge - cache first with short TTL
    if (url.pathname.startsWith('/api/knowledge')) {
      event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.api));
      return;
    }

    // Default API behavior
    event.respondWith(networkFirst(request, CACHE_NAMES.api));
    return;
  }

  // Static assets - cache first
  if (ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.assets));
    return;
  }

  // Images - cache first with longer expiration
  if (IMAGE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
    return;
  }

  // App shell - stale while revalidate
  if (SHELL_URLS.includes(url.pathname) || url.pathname === '/manifest.json') {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.shell));
    return;
  }

  // Default - network first
  event.respondWith(networkFirst(request, CACHE_NAMES.shell));
});

/**
 * Network First Strategy
 *
 * Try network first, fall back to cache. Good for API calls.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache the response if successful
    if (response.ok) {
      // Clone response before caching
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Fall back to cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }

    // Throw error for non-HTML requests
    throw error;
  }
}

/**
 * Cache First Strategy
 *
 * Try cache first, fall back to network. Good for static assets.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  // Try cache first
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // Fall back to network
  try {
    const response = await fetch(request);

    // Cache the response if successful
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache and network failed:', request.url);
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 *
 * Return cached version immediately, then update from network.
 * Good for app shell.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);

  // Get cached version immediately
  const cachedResponse = await cache.match(request);

  // Fetch from network in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached version if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

/**
 * Sync messages when back online
 */
async function syncMessages() {
  // Get all clients
  const clients = await self.clients.matchAll();

  // Notify all clients to sync
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_MESSAGES',
    });
  });
}

/**
 * Handle push notifications (future feature)
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'PersonalLog', options));
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data.url || '/')
  );
});

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      event.waitUntil(
        (async () => {
          const cache = await caches.open(CACHE_NAMES.api);
          await cache.addAll(data.urls);
        })()
      );
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(
        (async () => {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((name) => caches.delete(name))
          );
        })()
      );
      break;
    case 'INVALIDATE_CACHE':
      event.waitUntil(
        (async () => {
          // Invalidate specific cache by pattern
          const pattern = data.pattern;
          const cacheNames = await caches.keys();

          for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();

            for (const request of keys) {
              if (pattern.test(request.url)) {
                await cache.delete(request);
              }
            }
          }
        })()
      );
      break;
    case 'GET_CACHE_SIZE':
      event.waitUntil(
        (async () => {
          const cacheNames = await caches.keys();
          let totalSize = 0;

          for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();

            for (const request of keys) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
              }
            }
          }

          // Send size back to client
          event.ports[0].postMessage({ size: totalSize });
        })()
      );
      break;
  }
});
