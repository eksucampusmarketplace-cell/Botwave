const CACHE_NAME = 'botwave-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/settings',
  '/dashboard/sessions',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Non-critical if some pages fail to cache
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync — keep session alive
self.addEventListener('sync', (event) => {
  if (event.tag === 'botwave-keepalive') {
    event.waitUntil(
      fetch('/api/auth/session', { method: 'GET' }).catch(() => {})
    );
  }
});



// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const tag = data.tag || 'botwave-notification';
  const url = data.url || '/dashboard';

  event.waitUntil(
    self.registration.showNotification(data.title || 'BotWave', {
      body: data.body || 'New notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: tag,
      data: { url },
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if already open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
