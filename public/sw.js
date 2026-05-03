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

// Periodic sync — ping every 15 minutes to keep alive
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'botwave-keepalive') {
    event.waitUntil(
      fetch('/api/auth/session', { method: 'GET' }).catch(() => {})
    );
  }
});

// Push notification support (future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'BotWave', {
      body: data.body || 'New notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'botwave-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/dashboard')
  );
});
