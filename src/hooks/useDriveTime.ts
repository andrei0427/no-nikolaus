import { useState, useEffect, useRef } from 'react';
import { DriveTimeResult } from '../types';
import { TERMINALS } from '../utils/constants';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

    // Check if coordinates have changed significantly (more than ~500m)
    const coordsChanged =
      !lastCoordsRef.current ||
      Math.abs(lastCoordsRef.current.lat - userLat) > 0.005 ||
      Math.abs(lastCoordsRef.current.lon - userLon) > 0.005;

    // Check cache validity
    if (
      cacheRef.current &&
      !coordsChanged &&
      Date.now() - cacheRef.current.timestamp < CACHE_DURATION
    ) {
      setResult({
        cirkewwa: cacheRef.current.cirkewwa,
        mgarr: cacheRef.current.mgarr,
        loading: false,
        error: null,
      });
      return;
    }

    lastCoordsRef.current = { lat: userLat, lon: userLon };
    setResult((prev) => ({ ...prev, loading: true, error: null }));

    // Calculate drive times using straight-line distance estimation
    // This avoids requiring an external API key
    const estimateDriveTime = (destLat: number, destLon: number): number => {
      // Haversine distance
      const R = 6371; // Earth's radius in km
      const dLat = ((destLat - userLat) * Math.PI) / 180;
      const dLon = ((destLon - userLon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      // Estimate driving time: assume average 40 km/h due to Malta's roads
      // Add 1.3x factor for road winding
      const drivingTimeMinutes = (distanceKm * 1.3) / 40 * 60;

      return Math.round(drivingTimeMinutes);
    };

    const cirkewwaTime = estimateDriveTime(
      TERMINALS.cirkewwa.lat,
      TERMINALS.cirkewwa.lon
    );
    const mgarrTime = estimateDriveTime(
      TERMINALS.mgarr.lat,
      TERMINALS.mgarr.lon
    );

    cacheRef.current = {
      cirkewwa: cirkewwaTime,
      mgarr: mgarrTime,
      timestamp: Date.now(),
    };

    setResult({
      cirkewwa: cirkewwaTime,
      mgarr: mgarrTime,
      loading: false,
      error: null,
    });
  }, [userLat, userLon]);

  return result;
}
