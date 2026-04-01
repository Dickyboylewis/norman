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
  console.log('[Service Worker] Push event received');
  
  let data = {};
  
  // Extract data with resilient error handling
  if (event.data) {
    try {
      // Try to parse as JSON first
      data = event.data.json();
      console.log('[Service Worker] Successfully parsed JSON data:', data);
    } catch (jsonError) {
      console.warn('[Service Worker] Failed to parse as JSON:', jsonError);
      
      try {
        // Fallback to text if JSON parsing fails
        const text = event.data.text();
        console.log('[Service Worker] Received text data:', text);
        
        // Map text to notification body
        data = {
          title: 'White Red Hub',
          body: text || 'You have a new notification'
        };
      } catch (textError) {
        console.error('[Service Worker] Failed to get text data:', textError);
        // Use default notification
        data = {
          title: 'White Red Hub',
          body: 'You have a new notification'
        };
      }
    }
  }

  // Extract notification properties with defaults
  const title = data.title || 'Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192-WR.png',
    badge: data.badge || '/icon-192x192-WR.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'default-notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    renotify: true,
  };

  console.log('[Service Worker] Displaying notification:', title, options);

  // Properly await showNotification inside event.waitUntil
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(function () {
        console.log('[Service Worker] Notification displayed successfully');
      })
      .catch(function (error) {
        console.error('[Service Worker] Failed to display notification:', error);
      })
  );
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

// Fetch event - simplified pass-through to prevent redirect crashes
self.addEventListener('fetch', function (event) {
  // Simple pass-through: let the browser handle all requests normally
  // This prevents ERR_FAILED crashes on redirects
  event.respondWith(fetch(event.request));
});
