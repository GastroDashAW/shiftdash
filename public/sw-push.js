// ShiftDash Push Notification Service Worker
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '',
    icon: '/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png',
    badge: '/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'shiftdash-reminder',
    requireInteraction: true,
    actions: [
      { action: 'clock-in', title: 'Jetzt einstempeln' },
      { action: 'dismiss', title: 'Schliessen' }
    ],
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'ShiftDash', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.action === 'clock-in' ? '/clock' : (event.notification.data?.url || '/');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
