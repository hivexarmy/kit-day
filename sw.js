const CACHE_NAME = 'kit-day-v1';
const ASSETS = [
  '/kit-day/',
  '/kit-day/index.html',
  '/kit-day/settings.html',
  '/kit-day/app.js',
  '/kit-day/manifest.json',
  '/kit-day/icon-192.svg',
  '/kit-day/icon-512.svg'
];

// Install: cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Kit Day 🏋️';
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

// Notification click
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

// Message from app: schedule notification
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
