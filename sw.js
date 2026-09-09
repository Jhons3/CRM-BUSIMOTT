// Service Worker — CRM JISMART Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch(e) { data = { title: 'CRM JISMART', body: event.data.text() }; }

  const title   = data.title || '🔔 CRM JISMART';
  const options = {
    body:    data.body  || 'Tienes un nuevo lead asignado.',
    icon:    '/logo.jpeg',
    badge:   '/logo.jpeg',
    tag:     data.tag   || 'crm-notif',
    data:    { url: data.url || '/' },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
