import { useCallback, useMemo, useState } from 'react';
import { CartoonHeader } from './components/CartoonHeader';
import { NikolausStatusStrip } from './components/NikolausStatusStrip';
import { CartoonTerminalCard } from './components/CartoonTerminalCard';
import { CartoonLocationPermission } from './components/CartoonLocationPermission';
import { CartoonMap } from './components/CartoonMap';
import { CartoonWebcams } from './components/CartoonWebcams';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { StartTripButton } from './components/StartTripButton';
import { TripBanner } from './components/TripBanner';
import { useVesselStream } from './hooks/useVesselStream';
import { useGeolocation } from './hooks/useGeolocation';
import { useDriveTime } from './hooks/useDriveTime';
import { predictTerminalStatus } from './utils/prediction';
import { predictLikelyFerry } from './utils/ferryPrediction';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useTripNotification } from './hooks/useTripNotification';


function App() {
  const { vessels, nikolaus, portVehicleData, schedule, connected, lastUpdate } = useVesselStream();
  const {
    latitude,
    longitude,
    error: geoError,
    loading: geoLoading,
    permissionDenied,
    requestPermission,
  } = useGeolocation();

  const driveTime = useDriveTime(latitude, longitude);

  const hasLocation = latitude !== null && longitude !== null;

  const [tripActive, setTripActive] = useState(false);
  const [showBothTerminals, setShowBothTerminals] = useState(false);

  const cirkewwaStatus = useMemo(
    () =>
      predictTerminalStatus({
        nikolaus,
        terminal: 'cirkewwa',
        driveTime: driveTime.cirkewwa,
        schedule,
      }),
    [nikolaus, driveTime.cirkewwa, schedule]
  );

  const mgarrStatus = useMemo(
    () =>
      predictTerminalStatus({
        nikolaus,
        terminal: 'mgarr',
        driveTime: driveTime.mgarr,
        schedule,
      }),
    [nikolaus, driveTime.mgarr, schedule]
  );

  const cirkewwaFerryPrediction = useMemo(
    () => predictLikelyFerry(vessels, 'cirkewwa', driveTime.cirkewwa, null, portVehicleData.cirkewwa),
    [vessels, driveTime.cirkewwa, portVehicleData.cirkewwa]
  );

  const mgarrFerryPrediction = useMemo(
    () => predictLikelyFerry(vessels, 'mgarr', driveTime.mgarr, null, portVehicleData.mgarr),
    [vessels, driveTime.mgarr, portVehicleData.mgarr]
  );

  // Auto-select terminal based on which one user is closer to (if they have location)
  const autoSelectedTerminal = useMemo(() => {
    if (!hasLocation) return null;
    if (driveTime.cirkewwa !== null && driveTime.mgarr !== null) {
      return driveTime.cirkewwa < driveTime.mgarr ? 'cirkewwa' : 'mgarr';
    }
    return null;
  }, [hasLocation, driveTime.cirkewwa, driveTime.mgarr]);

  // Push notifications
  const { subscription, requestPermission: requestPushPermission } = usePushNotifications();

  // Combined permission request: location + notifications
  const requestAllPermissions = useCallback(() => {
    requestPermission();
    requestPushPermission();
  }, [requestPermission, requestPushPermission]);

  // Trip management
  const startTrip = useCallback(() => {
    requestAllPermissions();
    setTripActive(true);
  }, [requestAllPermissions]);

  const endTrip = useCallback(() => {
    setTripActive(false);
    setShowBothTerminals(false);
  }, []);

  // Get the status for the selected terminal (for trip notification)
  const selectedStatus = useMemo(() => {
    if (!autoSelectedTerminal) return null;
    return autoSelectedTerminal === 'cirkewwa' ? cirkewwaStatus : mgarrStatus;
  }, [autoSelectedTerminal, cirkewwaStatus, mgarrStatus]);

  // Trip notification — fires once when trip starts
  useTripNotification({
    tripActive,
    subscription,
    terminal: autoSelectedTerminal,
    status: selectedStatus,
  });

  // Determine display mode
  const isTrip = tripActive && hasLocation;
  const showSingleTerminal = isTrip && autoSelectedTerminal && !showBothTerminals;

  return (
    <div className="min-h-screen flex flex-col">
      <CartoonHeader connected={connected} lastUpdate={lastUpdate} />

      <NikolausStatusStrip nikolaus={nikolaus} />

      {/* Trip banner — shown when trip is active and we have location */}
      {isTrip && autoSelectedTerminal && (
        <TripBanner
          terminal={autoSelectedTerminal}
          driveTime={autoSelectedTerminal === 'cirkewwa' ? driveTime.cirkewwa : driveTime.mgarr}
          onEndTrip={endTrip}
        />
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 py-4 w-full space-y-4">
        {/* Map — promoted to top for instant visual context */}
        {vessels.length > 0 && (
          <CartoonMap vessels={vessels} />
        )}

        {/* Location permission — only shown in trip mode if permissions failed */}
        {tripActive && !hasLocation && (
          <CartoonLocationPermission
            onRequestPermission={requestAllPermissions}
            loading={geoLoading}
            permissionDenied={permissionDenied}
            hasLocation={hasLocation}
            error={geoError}
          />
        )}

        <PwaInstallBanner />

        {/* Start trip button — shown when not in trip mode */}
        {!tripActive && (
          <StartTripButton onStartTrip={startTrip} />
        )}

        {/* Terminal cards */}
        <div className={`grid gap-4 ${showSingleTerminal ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {(!showSingleTerminal || autoSelectedTerminal === 'cirkewwa') && (
            <CartoonTerminalCard
              terminal="cirkewwa"
              mode={isTrip ? 'trip' : 'live'}
              status={cirkewwaStatus}
              driveTime={driveTime.cirkewwa}
              driveTimeLoading={driveTime.loading}
              locationAvailable={hasLocation}
              ferryPrediction={cirkewwaFerryPrediction}
              queueData={portVehicleData.cirkewwa ?? undefined}
              isSelected={autoSelectedTerminal === 'cirkewwa'}
            />
          )}
          {(!showSingleTerminal || autoSelectedTerminal === 'mgarr') && (
            <CartoonTerminalCard
              terminal="mgarr"
              mode={isTrip ? 'trip' : 'live'}
              status={mgarrStatus}
              driveTime={driveTime.mgarr}
              driveTimeLoading={driveTime.loading}
              locationAvailable={hasLocation}
              ferryPrediction={mgarrFerryPrediction}
              queueData={portVehicleData.mgarr ?? undefined}
              isSelected={autoSelectedTerminal === 'mgarr'}
            />
          )}
        </div>

        {/* Toggle to show/hide both terminals — trip mode only */}
        {isTrip && autoSelectedTerminal && (
          <div className="text-center">
            <button
              onClick={() => setShowBothTerminals((prev) => !prev)}
              className="bg-white bg-opacity-70 hover:bg-opacity-90 text-amber-800 font-medium text-sm px-4 py-2 rounded-full border border-amber-300 shadow-sm transition-all duration-200"
            >
              {showBothTerminals ? 'Show only my terminal' : 'View both terminals'}
            </button>
          </div>
        )}

        {/* Webcams */}
        <CartoonWebcams />

        {/* Footer */}
        <footer className="text-center text-white text-opacity-80 text-sm pb-4 pt-2 space-y-1">
          <p>Not affiliated with Gozo Channel Co. — a community project</p>
          <p>Predictions are estimates and may not reflect actual ferry assignments</p>
          <p className="text-xs text-white text-opacity-60">Data from Gozo Channel vessel tracking</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
