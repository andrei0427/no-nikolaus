import { useState, useCallback, useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

interface UsePushNotificationsResult {
  supported: boolean;
  permission: NotificationPermission | null;
  subscription: PushSubscription | null;
  requestPermission: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const supported =
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  const [permission, setPermission] = useState<NotificationPermission | null>(
    supported ? Notification.permission : null
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Try to reuse existing subscription on mount
  useEffect(() => {
    if (!supported || Notification.permission !== 'granted') return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setSubscription(sub);
      })
      .catch(() => {});
  }, [supported]);

  const requestPermission = useCallback(async () => {
    if (!supported) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') return; // user denied — not an error

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('VITE_VAPID_PUBLIC_KEY not set');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setSubscription(sub);
    } catch {
      // Push subscription failure is a browser/permission issue, not a service error
    }
  }, [supported]);

  return { supported, permission, subscription, requestPermission };
}
