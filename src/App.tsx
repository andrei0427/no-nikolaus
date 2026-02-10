import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { TerminalPanel } from './components/TerminalPanel';
import { LocationPermission } from './components/LocationPermission';
import { MapView } from './components/MapView';
import { useVesselStream } from './hooks/useVesselStream';
import { useGeolocation } from './hooks/useGeolocation';
import { useDriveTime } from './hooks/useDriveTime';
import { predictTerminalStatus } from './utils/prediction';
import { predictLikelyFerry } from './utils/ferryPrediction';
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
            className={`cursor-pointer transition-all duration-300 rounded-xl ${
              autoSelectedTerminal === 'cirkewwa'
                ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.02] shadow-lg shadow-blue-500/20'
                : autoSelectedTerminal === 'mgarr'
                  ? 'opacity-60 hover:opacity-80'
                  : ''
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
            {autoSelectedTerminal === 'cirkewwa' && (
              <div className="bg-blue-500 text-white text-xs font-medium py-1 px-3 rounded-b-xl text-center -mt-1">
                Your departure terminal
              </div>
            )}
          </div>
          <div
            onClick={() => setSelectedTerminal('mgarr')}
            className={`cursor-pointer transition-all duration-300 rounded-xl ${
              autoSelectedTerminal === 'mgarr'
                ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.02] shadow-lg shadow-blue-500/20'
                : autoSelectedTerminal === 'cirkewwa'
                  ? 'opacity-60 hover:opacity-80'
                  : ''
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
            {autoSelectedTerminal === 'mgarr' && (
              <div className="bg-blue-500 text-white text-xs font-medium py-1 px-3 rounded-b-xl text-center -mt-1">
                Your departure terminal
              </div>
            )}
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
