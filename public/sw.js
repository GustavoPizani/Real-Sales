const CACHE_NAME = 'real-sales-v2';
const STATIC_ASSETS = ['/', '/dashboard'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Real Sales', body: event.data.text() }; }

  const data = payload.data ?? {};
  const clientId = data.clientId;
  const url = clientId ? `/client/${clientId}` : '/dashboard';

  const options = {
    body: payload.body ?? '',
    icon: '/api/pwa/icon?size=192',
    badge: '/api/pwa/icon?size=72',
    data: { ...data, url },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: clientId
      ? [{ action: 'open', title: 'Ver lead' }]
      : [],
    tag: clientId ? `lead-${clientId}` : 'general',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Real Sales', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem uma janela aberta com essa URL, foca nela
      const existing = windowClients.find((c) => c.url.includes(url));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      // Tenta focar qualquer janela do app e navegar
      if (windowClients.length > 0) {
        windowClients[0].focus();
        return windowClients[0].navigate(url);
      }
      // Nenhuma janela aberta — abre uma nova
      return clients.openWindow(url);
    })
  );
});
