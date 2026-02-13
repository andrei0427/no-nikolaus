import { useState, useEffect, useCallback, useRef } from 'react';
import { GeolocationState } from '../types';
import { reportError } from '../utils/reportError';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function friendlyErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission was denied. Please enable it in your browser or system settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Could not determine your location. Make sure Location Services are enabled in System Settings > Privacy & Security > Location Services.';
    case error.TIMEOUT:
      return 'Location request timed out. Please check your connection and try again.';
    default:
      return 'An unknown location error occurred. Please try again.';
  }
}

export function useGeolocation(): GeolocationState & { requestPermission: () => void } {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionDenied: false,
  });
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        loading: false,
      }));
      return;
    }

    retryCountRef.current = 0;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const onSuccess = (position: GeolocationPosition) => {
      retryCountRef.current = 0;
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
        permissionDenied: false,
      });
    };

    const attempt = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (error) => {
          // Permission denied — no point retrying
          if (error.code === error.PERMISSION_DENIED) {
            setState({
              latitude: null,
              longitude: null,
              error: friendlyErrorMessage(error),
              loading: false,
              permissionDenied: true,
            });
            return;
          }

          retryCountRef.current += 1;

          if (retryCountRef.current < MAX_RETRIES) {
            // Retry after a short delay, alternating accuracy mode
            retryTimerRef.current = setTimeout(() => {
              attempt(retryCountRef.current % 2 === 1);
            }, RETRY_DELAY_MS);
          } else {
            // All retries exhausted
            reportError('Geolocation', `Retries exhausted: ${error.message}`);
            setState({
              latitude: null,
              longitude: null,
              error: friendlyErrorMessage(error),
              loading: false,
              permissionDenied: false,
            });
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 30000 : 15000,
          maximumAge: 600000, // accept cached positions up to 10 min old
        }
      );
    };

    // First attempt: low accuracy (faster)
    attempt(false);
  }, []);

  // Watch position for updates once we have an initial fix
  useEffect(() => {
    if (!navigator.geolocation || state.permissionDenied) return;
    if (state.latitude === null) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        }));
      },
      () => {
        // Silently ignore watch errors — we already have a position
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [state.latitude, state.permissionDenied]);

  // Clean up retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return { ...state, requestPermission };
}
