import { useEffect, useRef } from 'react';
import { API_URL } from '../utils/apiUrl';
import type { Terminal, TerminalStatus } from '../types';

interface UseTripNotificationParams {
  tripActive: boolean;
  subscription: PushSubscription | null;
  terminal: Terminal | null;
  status: TerminalStatus | null;
}

export function useTripNotification({
  tripActive,
  subscription,
  terminal,
  status,
}: UseTripNotificationParams) {
  const sentRef = useRef(false);

  // Reset when trip ends
  useEffect(() => {
    if (!tripActive) {
      sentRef.current = false;
    }
  }, [tripActive]);

  useEffect(() => {
    if (!tripActive || !subscription || !terminal || !status || sentRef.current) {
      return;
    }

    sentRef.current = true;

    const terminalName = terminal === 'cirkewwa' ? 'Cirkewwa' : 'Mgarr';
    let message: string;

    if (status.safeToCrossNow) {
      if (status.safeMinutes !== null) {
        message = `All clear — Nikolaus won't be at ${terminalName} for ~${status.safeMinutes} min`;
      } else {
        message = `All clear — Nikolaus won't affect your trip to ${terminalName}`;
      }
    } else {
      if (status.safeMinutes !== null) {
        message = `Nikolaus is at ${terminalName}. Should clear in ~${status.safeMinutes} min`;
      } else {
        message = `Heads up — Nikolaus may be at ${terminalName} when you arrive`;
      }
    }

    fetch(`${API_URL}/api/send-trip-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        terminal,
        message,
        safeToCrossNow: status.safeToCrossNow,
        safeMinutes: status.safeMinutes,
      }),
    })
      .then((res) => {
        if (res.status === 410) {
          sentRef.current = false;
        }
      })
      .catch(() => {
        sentRef.current = false;
      });
  }, [tripActive, subscription, terminal, status]);
}
