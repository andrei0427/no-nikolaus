import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { TerminalPanel } from './components/TerminalPanel';
import { LocationPermission } from './components/LocationPermission';
import { MapView } from './components/MapView';
import { useVesselTracking } from './hooks/useVesselTracking';
import { useGeolocation } from './hooks/useGeolocation';
import { useDriveTime } from './hooks/useDriveTime';
import { predictTerminalStatus } from './utils/prediction';
import { predictLikelyFerry } from './utils/ferryPrediction';
import { Terminal } from './types';

function App() {
  const { vessels, nikolaus, connected, lastUpdate } = useVesselTracking();
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

  const userLocation = hasLocation ? { lat: latitude!, lon: longitude! } : null;

  // Auto-select terminal based on which one user is closer to (if they have location)
  const autoSelectedTerminal = useMemo(() => {
    if (selectedTerminal) return selectedTerminal;
    if (!hasLocation) return null;
    if (driveTime.cirkewwa !== null && driveTime.mgarr !== null) {
      return driveTime.cirkewwa < driveTime.mgarr ? 'cirkewwa' : 'mgarr';
    }
    return null;
  }, [selectedTerminal, hasLocation, driveTime.cirkewwa, driveTime.mgarr]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Header connected={connected} lastUpdate={lastUpdate} />

      <LocationPermission
        onRequestPermission={requestPermission}
        loading={geoLoading}
        permissionDenied={permissionDenied}
        hasLocation={hasLocation}
      />

      <main className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div
            onClick={() => setSelectedTerminal('cirkewwa')}
            className={`cursor-pointer transition-all ${
              autoSelectedTerminal === 'cirkewwa' ? 'ring-2 ring-blue-500 ring-offset-2 rounded-xl' : ''
            }`}
          >
            <TerminalPanel
              terminal="cirkewwa"
              status={cirkewwaStatus}
              driveTime={driveTime.cirkewwa}
              driveTimeLoading={driveTime.loading}
              locationAvailable={hasLocation}
              ferryPrediction={cirkewwaFerryPrediction}
            />
          </div>
          <div
            onClick={() => setSelectedTerminal('mgarr')}
            className={`cursor-pointer transition-all ${
              autoSelectedTerminal === 'mgarr' ? 'ring-2 ring-blue-500 ring-offset-2 rounded-xl' : ''
            }`}
          >
            <TerminalPanel
              terminal="mgarr"
              status={mgarrStatus}
              driveTime={driveTime.mgarr}
              driveTimeLoading={driveTime.loading}
              locationAvailable={hasLocation}
              ferryPrediction={mgarrFerryPrediction}
            />
          </div>
        </div>

        {vessels.length > 0 && (
          <div className="mt-6">
            <MapView
              vessels={vessels}
              nikolaus={nikolaus}
              userLocation={userLocation}
              driveTime={driveTime}
              selectedTerminal={autoSelectedTerminal ?? undefined}
            />
          </div>
        )}

        <footer className="mt-8 text-center text-slate-400 text-xs pb-4">
          <p>Data from Gozo Channel vessel tracking</p>
          <p className="mt-1">
            Predictions are estimates and may not reflect actual ferry assignments
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
