const CACHE_NAME = 'kit-day-v2';
const ASSETS = [
  '/kit-day/',
  '/kit-day/index.html',
  '/kit-day/collection.html',
  '/kit-day/settings.html',
  '/kit-day/app.js',
  '/kit-day/manifest.json',
  '/kit-day/icon-192.svg',
  '/kit-day/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Kit Day';
  const options = {
    body: data.body || 'Hora do treino! Vem ver qual camisa vestir hoje.',
    icon: '/kit-day/icon-192.svg',
    badge: '/kit-day/icon-192.svg',
    tag: 'kit-day-daily',
    renotify: true,
    data: { url: '/kit-day/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('/kit-day/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/kit-day/');
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delayMs, title, body } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/kit-day/icon-192.svg',
        badge: '/kit-day/icon-192.svg',
        tag: 'kit-day-daily',
        renotify: true
      });
    }, delayMs);
  }
});
