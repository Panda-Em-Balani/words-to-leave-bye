/* =============================================================================
   Service worker.

   Two jobs:
     1. Receive the 8am push and put it on her lock screen.
     2. Keep the app usable with no signal, because it does not actually need
        the network to know today's quote.
   ============================================================================= */

const CACHE = 'wtlb-v1';

const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/quotes.js',
  '/daily.js',
  '/manifest.webmanifest',
  '/icons/panda.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The owner console is a tool, not part of the app. It stays off the cache
  // so it is never served stale and never sits in storage on her phone.
  if (url.pathname.startsWith('/console')) return;

  // The API is never worth serving stale.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('{}', {
      headers: { 'Content-Type': 'application/json' },
    })));
    return;
  }

  // Everything else: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* -----------------------------------------------------------------------------
   The 8am arrival
   ----------------------------------------------------------------------------- */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Words to: "Leave, Bye."';
  const body = payload.body || 'From your Bestfriend\nSomething unhelpful, as promised.';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: payload.tag || 'wtlb-daily',
      renotify: true,
      data: { url: payload.url || '/', by: payload.by || null },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
