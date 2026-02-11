import { useEffect, useRef } from 'react';
import { haversineDistance } from '../utils/coordinates';
import { TERMINALS } from '../utils/constants';
import { reportError } from '../utils/reportError';
import type { Terminal } from '../types';

const PROXIMITY_THRESHOLD_KM = 0.5; // 500 meters

interface UseProximityNotificationParams {
  latitude: number | null;
  longitude: number | null;
  autoSelectedTerminal: Terminal | null;
  ferryName: string | null;
  subscription: PushSubscription | null;
}

export function useProximityNotification({
  latitude,
  longitude,
  autoSelectedTerminal,
  ferryName,
  subscription,
}: UseProximityNotificationParams) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (
      !latitude ||
      !longitude ||
      !autoSelectedTerminal ||
      !ferryName ||
      !subscription
    ) {
      return;
    }

    // Check sessionStorage dedup
    const storageKey = `push-sent-${autoSelectedTerminal}`;
    if (sessionStorage.getItem(storageKey) || sentRef.current) return;

    const terminal = TERMINALS[autoSelectedTerminal];
    const distance = haversineDistance(latitude, longitude, terminal.lat, terminal.lon);

    if (distance > PROXIMITY_THRESHOLD_KM) return;

    // Within range — send push request
    sentRef.current = true;
    sessionStorage.setItem(storageKey, '1');

    fetch('/api/send-prediction-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        terminal: autoSelectedTerminal,
        ferryName,
      }),
    })
      .then((res) => {
        if (res.status === 410) {
          // Subscription expired — clear dedup so it can retry after resubscribe
          sessionStorage.removeItem(storageKey);
          sentRef.current = false;
        }
      })
      .catch((err) => {
        reportError('Proximity push', err);
        sessionStorage.removeItem(storageKey);
        sentRef.current = false;
      });
  }, [latitude, longitude, autoSelectedTerminal, ferryName, subscription]);
}
