import { useState, useEffect, useRef } from 'react';
import { Vessel, PortVehicleData, FerrySchedule } from '../types';
import { reportError } from '../utils/reportError';
import { API_URL } from '../utils/apiUrl';

interface UseVesselStreamResult {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  portVehicleData: PortVehicleData;
  schedule: FerrySchedule | null;
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export function useVesselStream(): UseVesselStreamResult {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [portVehicleData, setPortVehicleData] = useState<PortVehicleData>({ cirkewwa: null, mgarr: null });
  const [schedule, setSchedule] = useState<FerrySchedule | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const consecutiveFailsRef = useRef(0);

  useEffect(() => {
    const REPORT_AFTER = 5; // only alert after 5 consecutive failures

    const connect = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${API_URL}/api/vessels/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        consecutiveFailsRef.current = 0;
        setConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setVessels(data.vessels);
          if (data.portVehicleData) {
            setPortVehicleData(data.portVehicleData);
          }
          if (data.schedule) {
            setSchedule(data.schedule);
          }
          setLastUpdate(new Date(data.timestamp));
        } catch (e) {
          reportError('SSE parse', e);
        }
      };

      eventSource.onerror = () => {
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
    portVehicleData,
    schedule,
    connected,
    lastUpdate,
    error,
  };
}
