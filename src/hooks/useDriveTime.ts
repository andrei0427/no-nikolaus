import { useState, useEffect, useRef, useCallback } from 'react';
import { DriveTimeResult } from '../types';
import { TERMINALS } from '../utils/constants';

const CACHE_DURATION = 60 * 1000; // 1 minute - shorter for active driving
const REFRESH_INTERVAL = 60 * 1000; // Refresh every minute

interface CacheEntry {
  cirkewwa: number | null;
  mgarr: number | null;
  timestamp: number;
}

export function useDriveTime(
  userLat: number | null,
  userLon: number | null
): DriveTimeResult {
  const [result, setResult] = useState<DriveTimeResult>({
    cirkewwa: null,
    mgarr: null,
    loading: false,
    error: null,
  });

  const cacheRef = useRef<CacheEntry | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Calculate drive times using straight-line distance estimation
  const calculateDriveTimes = useCallback(
    (lat: number, lon: number) => {
      const estimateDriveTime = (destLat: number, destLon: number): number => {
        // Haversine distance
        const R = 6371; // Earth's radius in km
        const dLat = ((destLat - lat) * Math.PI) / 180;
        const dLon = ((destLon - lon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((destLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Estimate driving time: assume average 40 km/h due to Malta's roads
        // Add 1.3x factor for road winding
        const drivingTimeMinutes = ((distanceKm * 1.3) / 40) * 60;

        return Math.round(drivingTimeMinutes);
      };

      return {
        cirkewwa: estimateDriveTime(TERMINALS.cirkewwa.lat, TERMINALS.cirkewwa.lon),
        mgarr: estimateDriveTime(TERMINALS.mgarr.lat, TERMINALS.mgarr.lon),
      };
    },
    []
  );

  // Periodic refresh every minute to keep predictions accurate while driving
  useEffect(() => {
    if (userLat === null || userLon === null) return;

    const intervalId = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [userLat, userLon]);

  useEffect(() => {
    if (userLat === null || userLon === null) {
      setResult({
        cirkewwa: null,
        mgarr: null,
        loading: false,
        error: null,
      });
      return;
    }

    // Check if coordinates have changed significantly (more than ~100m for better responsiveness)
    const coordsChanged =
      !lastCoordsRef.current ||
      Math.abs(lastCoordsRef.current.lat - userLat) > 0.001 ||
      Math.abs(lastCoordsRef.current.lon - userLon) > 0.001;

    // Check cache validity
    if (
      cacheRef.current &&
      !coordsChanged &&
      Date.now() - cacheRef.current.timestamp < CACHE_DURATION
    ) {
      return; // Use cached result, no update needed
    }

    lastCoordsRef.current = { lat: userLat, lon: userLon };

    const times = calculateDriveTimes(userLat, userLon);

    cacheRef.current = {
      cirkewwa: times.cirkewwa,
      mgarr: times.mgarr,
      timestamp: Date.now(),
    };

    setResult({
      cirkewwa: times.cirkewwa,
      mgarr: times.mgarr,
      loading: false,
      error: null,
    });
  }, [userLat, userLon, refreshTrigger, calculateDriveTimes]);

  return result;
}
