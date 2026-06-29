const CACHE_NAME = 'nordic-crm-v6';
const STATIC_ASSETS = ['/login', '/icons/icon.svg', '/nordic-logo.svg'];

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

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
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/login');
          }
          return new Response('Offline', { status: 503 });
        })
      )
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Nordic CRM', body: event.data.text() }; }

  const data = payload.data ?? {};
  const clientId = data.clientId;
  const url = clientId ? `/client/${clientId}` : '/dashboard';

  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
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
    self.registration.showNotification(payload.title ?? 'Nordic CRM', options)
      .then(() => {
        if ('setAppBadge' in navigator) {
          return navigator.setAppBadge(1).catch(() => null)
        }
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const { publicKey } = await fetch('/api/notifications/vapid-public').then(r => r.json())
        if (!publicKey) return

        const newSub = event.newSubscription
          ?? await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          })

        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newSub),
        })
      } catch (err) {
        console.error('[SW] pushsubscriptionchange falhou:', err)
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => null)
  }

  const url = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(url));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      if (windowClients.length > 0) {
        windowClients[0].focus();
        return windowClients[0].navigate(url);
      }
      return clients.openWindow(url);
    })
  );
});
