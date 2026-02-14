/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;
declare const __API_URL__: string;

// Workbox precaching (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime cache for OpenRouteService API
registerRoute(
  /^https:\/\/api\.openrouteservice\.org\/.*/i,
  new NetworkFirst({
    cacheName: 'route-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
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
  type?: 'trip' | 'prediction';
  ferryName?: string;
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data: PushPayload = event.data.json();

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.type === 'trip' ? `trip-${data.terminal}` : `prediction-${data.terminal}`,
    renotify: true,
    data: { terminal: data.terminal, type: data.type || 'prediction', ferryName: data.ferryName },
  };

  // Only add feedback actions for prediction-type notifications
  if (data.type !== 'trip' && data.ferryName) {
    options.actions = [
      { action: 'yes', title: 'Yes' },
      { action: 'no', title: 'No' },
    ];
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  const { terminal, ferryName, type } = event.notification.data;

  event.notification.close();

  if (type !== 'trip' && (event.action === 'yes' || event.action === 'no')) {
    // User tapped a feedback action button
    event.waitUntil(
      fetch(`${__API_URL__}/api/prediction-feedback`, {
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
    // Body tap or trip notification — open the app
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
