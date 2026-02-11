import { useState, useEffect, useRef } from 'react';
import { Vessel } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UseVesselStreamResult {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export function useVesselStream(): UseVesselStreamResult {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const connect = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log('Connecting to SSE stream...');
      const eventSource = new EventSource(`${API_URL}/api/vessels/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection established');
        setConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setVessels(data.vessels);
          setLastUpdate(new Date(data.timestamp));
        } catch (e) {
          console.error('Failed to parse SSE message:', e);
        }
      };

      eventSource.onerror = () => {
        console.log('SSE connection error');
        setConnected(false);
        setError('Connection lost. Reconnecting...');
        eventSource.close();

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const nikolaus = vessels.find((v) => v.isNikolaus) || null;

  return {
    vessels,
    nikolaus,
    connected,
    lastUpdate,
    error,
  };
}
