/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Workbox precaching (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime cache for OpenRouteService API
registerRoute(
  /^https:\/\/api\.openrouteservice\.org\/.*/i,
  new CacheFirst({
    cacheName: 'route-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

interface PushPayload {
  title: string;
  body: string;
  terminal: string;
  ferryName: string;
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received', event.data ? 'with data' : 'without data');

  if (!event.data) return;

  const data: PushPayload = event.data.json();
  console.log('[SW] Push payload:', JSON.stringify(data));

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `prediction-${data.terminal}`,
    renotify: true,
    data: { terminal: data.terminal, ferryName: data.ferryName },
    actions: [
      { action: 'yes', title: 'Yes ✅' },
      { action: 'no', title: 'No ❌' },
    ],
  };

  console.log('[SW] Showing notification:', data.title);
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  const { terminal, ferryName } = event.notification.data;
  console.log('[SW] Notification clicked, action:', event.action || 'body');

  event.notification.close();

  if (event.action === 'yes' || event.action === 'no') {
    // User tapped an action button — send feedback
    event.waitUntil(
      fetch('/api/prediction-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal,
          ferryName,
          correct: event.action === 'yes',
        }),
      }).catch((err) => console.error('Feedback POST failed:', err))
    );
  } else {
    // Body tap — open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});
