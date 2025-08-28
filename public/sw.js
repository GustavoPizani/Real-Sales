// public/sw.js
self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png', // Opcional: adicione um ícone
    badge: '/icon-192x192.png' // Opcional: adicione um badge
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
