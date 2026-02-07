import { useState, useEffect, useCallback } from 'react';
import { GeolocationState } from '../types';

export function useGeolocation(): GeolocationState & { requestPermission: () => void } {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionDenied: false,
  });

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation not supported',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        setState({
          latitude: null,
          longitude: null,
          error: error.message,
          loading: false,
          permissionDenied: error.code === error.PERMISSION_DENIED,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Watch position for updates
  useEffect(() => {
    if (!navigator.geolocation || state.permissionDenied) {
      return;
    }

    // Only watch if we already have permission (latitude is set)
    if (state.latitude === null) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        }));
      },
      (error) => {
        // Don't override permission denied
        if (error.code !== error.PERMISSION_DENIED) {
          setState((prev) => ({
            ...prev,
            error: error.message,
          }));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [state.latitude, state.permissionDenied]);

  return { ...state, requestPermission };
}
