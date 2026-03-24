// Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, url } = data;

  const options = {
    body: body || '',
    icon: icon || '/icon-192x192-WR.png',
    badge: '/icon-192x192-WR.png',
    data: { url: url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
