// Service Worker for Web Push Notifications
// Enhanced for iOS Safari PWA compatibility

const CACHE_NAME = 'white-red-v1';

// Install event - cache essential resources
self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll([
        '/',
        '/icon-192x192-WR.png',
        '/icon-512x512-WR.png',
      ]);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push received');
  
  if (!event.data) {
    console.log('[Service Worker] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, url, badge, tag, requireInteraction } = data;

    const options = {
      body: body || 'You have a new notification',
      icon: icon || '/icon-192x192-WR.png',
      badge: badge || '/icon-192x192-WR.png',
      data: { url: url || '/' },
      tag: tag || 'default-notification',
      requireInteraction: requireInteraction || false,
      vibrate: [200, 100, 200],
      // iOS-specific: ensure notification is visible
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(title || 'White Red', options)
        .then(function () {
          console.log('[Service Worker] Notification shown successfully');
        })
        .catch(function (error) {
          console.error('[Service Worker] Error showing notification:', error);
        })
    );
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // Check if there's already a window open with this URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            console.log('[Service Worker] Focusing existing window');
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          console.log('[Service Worker] Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(function (error) {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

// Fetch event - basic offline support (optional, but good for PWA)
self.addEventListener('fetch', function (event) {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
