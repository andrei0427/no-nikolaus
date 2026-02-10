import { useMemo, useState } from 'react';
import { CartoonHeader } from './components/CartoonHeader';
import { CartoonTerminalCard } from './components/CartoonTerminalCard';
import { CartoonLocationPermission } from './components/CartoonLocationPermission';
import { CartoonMap } from './components/CartoonMap';
import { WaveBorder } from './components/WaveBorder';
import { useVesselStream } from './hooks/useVesselStream';
import { useGeolocation } from './hooks/useGeolocation';
import { useDriveTime } from './hooks/useDriveTime';
import { predictTerminalStatus } from './utils/prediction';
import { predictLikelyFerry, predictNikolausPosition } from './utils/ferryPrediction';
import { Terminal } from './types';

function App() {
  const { vessels, nikolaus, connected, lastUpdate } = useVesselStream();
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const {
    latitude,
    longitude,
    loading: geoLoading,
    permissionDenied,
    requestPermission,
  } = useGeolocation();

  const driveTime = useDriveTime(latitude, longitude);

  const hasLocation = latitude !== null && longitude !== null;

  const cirkewwaStatus = useMemo(
    () =>
      predictTerminalStatus({
        nikolaus,
        terminal: 'cirkewwa',
        driveTime: driveTime.cirkewwa,
      }),
    [nikolaus, driveTime.cirkewwa]
  );

  const mgarrStatus = useMemo(
    () =>
      predictTerminalStatus({
        nikolaus,
        terminal: 'mgarr',
        driveTime: driveTime.mgarr,
      }),
    [nikolaus, driveTime.mgarr]
  );

  const cirkewwaFerryPrediction = useMemo(
    () => predictLikelyFerry(vessels, 'cirkewwa', driveTime.cirkewwa),
    [vessels, driveTime.cirkewwa]
  );

  const mgarrFerryPrediction = useMemo(
    () => predictLikelyFerry(vessels, 'mgarr', driveTime.mgarr),
    [vessels, driveTime.mgarr]
  );

  // Auto-select terminal based on which one user is closer to (if they have location)
  const autoSelectedTerminal = useMemo(() => {
    if (selectedTerminal) return selectedTerminal;
    if (!hasLocation) return null;
    if (driveTime.cirkewwa !== null && driveTime.mgarr !== null) {
      return driveTime.cirkewwa < driveTime.mgarr ? 'cirkewwa' : 'mgarr';
    }
    return null;
  }, [selectedTerminal, hasLocation, driveTime.cirkewwa, driveTime.mgarr]);

  // Predicted Nikolaus position
  const predictedNikolausPos = useMemo(() => {
    if (!nikolaus || !autoSelectedTerminal) return null;
    const targetDriveTime =
      autoSelectedTerminal === 'cirkewwa' ? driveTime.cirkewwa : driveTime.mgarr;
    const prediction = predictNikolausPosition(nikolaus, autoSelectedTerminal, targetDriveTime);
    return prediction ? { lat: prediction.lat, lon: prediction.lon } : null;
  }, [nikolaus, autoSelectedTerminal, driveTime.cirkewwa, driveTime.mgarr]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top wave border */}
      <WaveBorder position="top" />

      <CartoonHeader connected={connected} lastUpdate={lastUpdate} />

      <CartoonLocationPermission
        onRequestPermission={requestPermission}
        loading={geoLoading}
        permissionDenied={permissionDenied}
        hasLocation={hasLocation}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        {/* Terminal cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <CartoonTerminalCard
            terminal="cirkewwa"
            status={cirkewwaStatus}
            driveTime={driveTime.cirkewwa}
            driveTimeLoading={driveTime.loading}
            locationAvailable={hasLocation}
            ferryPrediction={cirkewwaFerryPrediction}
            isSelected={autoSelectedTerminal === 'cirkewwa'}
            onClick={() => setSelectedTerminal('cirkewwa')}
          />
          <CartoonTerminalCard
            terminal="mgarr"
            status={mgarrStatus}
            driveTime={driveTime.mgarr}
            driveTimeLoading={driveTime.loading}
            locationAvailable={hasLocation}
            ferryPrediction={mgarrFerryPrediction}
            isSelected={autoSelectedTerminal === 'mgarr'}
            onClick={() => setSelectedTerminal('mgarr')}
          />
        </div>

        {/* Cartoon map */}
        {vessels.length > 0 && (
          <CartoonMap
            vessels={vessels}
            nikolaus={nikolaus}
            predictedNikolausPosition={predictedNikolausPos}
          />
        )}

        {/* User location indicator */}
        {hasLocation && (
          <div className="mt-4 text-center">
            <span className="inline-block bg-white bg-opacity-80 px-4 py-2 rounded-full text-amber-800 font-medium shadow-md">
              📍 Your location:{' '}
              {autoSelectedTerminal === 'mgarr' ? 'Gozo' : 'Malta'}
            </span>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-white text-opacity-80 text-sm pb-4">
          <p>Data from Gozo Channel vessel tracking</p>
          <p className="mt-1 text-xs">
            Predictions are estimates and may not reflect actual ferry assignments
          </p>
        </footer>
      </main>

      {/* Bottom wave border */}
      <WaveBorder position="bottom" />
    </div>
  );
}

export default App;
