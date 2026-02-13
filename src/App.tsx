import { useCallback, useMemo, useState } from 'react';
import { API_URL } from './utils/apiUrl';
import { reportError } from './utils/reportError';
import { CartoonHeader } from './components/CartoonHeader';
import { NikolausStatusStrip } from './components/NikolausStatusStrip';
import { CartoonTerminalCard } from './components/CartoonTerminalCard';
import { CartoonLocationPermission } from './components/CartoonLocationPermission';
import { CartoonMap } from './components/CartoonMap';
import { CartoonWebcams } from './components/CartoonWebcams';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { useVesselStream } from './hooks/useVesselStream';
import { useGeolocation } from './hooks/useGeolocation';
import { useDriveTime } from './hooks/useDriveTime';
import { predictTerminalStatus } from './utils/prediction';
import { predictLikelyFerry, getNextDeparture } from './utils/ferryPrediction';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useProximityNotification } from './hooks/useProximityNotification';


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

  const [showBothTerminals, setShowBothTerminals] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showThankYou, setShowThankYou] = useState<'yes' | 'no' | null>(null);

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
    () => predictLikelyFerry(vessels, 'cirkewwa', driveTime.cirkewwa, schedule, portVehicleData.cirkewwa),
    [vessels, driveTime.cirkewwa, schedule, portVehicleData.cirkewwa]
  );

  const mgarrFerryPrediction = useMemo(
    () => predictLikelyFerry(vessels, 'mgarr', driveTime.mgarr, schedule, portVehicleData.mgarr),
    [vessels, driveTime.mgarr, schedule, portVehicleData.mgarr]
  );

  const cirkewwaNextDeparture = useMemo(
    () => getNextDeparture('cirkewwa', schedule, driveTime.cirkewwa, cirkewwaFerryPrediction.departureTime),
    [schedule, driveTime.cirkewwa, cirkewwaFerryPrediction.departureTime]
  );

  const mgarrNextDeparture = useMemo(
    () => getNextDeparture('mgarr', schedule, driveTime.mgarr, mgarrFerryPrediction.departureTime),
    [schedule, driveTime.mgarr, mgarrFerryPrediction.departureTime]
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

  const predictedFerryName = useMemo(() => {
    if (!autoSelectedTerminal) return null;
    const prediction = autoSelectedTerminal === 'cirkewwa' ? cirkewwaFerryPrediction : mgarrFerryPrediction;
    return prediction.ferry?.name ?? null;
  }, [autoSelectedTerminal, cirkewwaFerryPrediction, mgarrFerryPrediction]);

  useProximityNotification({
    latitude,
    longitude,
    autoSelectedTerminal,
    ferryName: predictedFerryName,
    subscription,
  });

  const showSingleTerminal = autoSelectedTerminal && !showBothTerminals;

  return (
    <div className="min-h-screen flex flex-col">
      <CartoonHeader connected={connected} lastUpdate={lastUpdate} />

      <NikolausStatusStrip nikolaus={nikolaus} />

      {/* TEMPORARY: Test prediction feedback modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="cartoon-card p-6 max-w-sm w-full text-center">
            <p className="text-lg font-bold text-amber-800 mb-2">Ferry Prediction Check</p>
            <p className="text-amber-800 mb-4">
              We predicted you'd get <strong>{predictedFerryName || 'MV Malita'}</strong> at{' '}
              <strong>{autoSelectedTerminal === 'mgarr' ? 'Mġarr' : 'Ċirkewwa'}</strong> — did we get it right?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setShowThankYou('yes');
                  fetch(`${API_URL}/api/prediction-feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      terminal: autoSelectedTerminal || 'cirkewwa',
                      ferryName: predictedFerryName || 'MV Malita',
                      correct: true,
                    }),
                  }).catch((err) => reportError('Feedback fetch', err));
                }}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl border-2 border-green-700"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setShowThankYou('no');
                  fetch(`${API_URL}/api/prediction-feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      terminal: autoSelectedTerminal || 'cirkewwa',
                      ferryName: predictedFerryName || 'MV Malita',
                      correct: false,
                    }),
                  }).catch((err) => reportError('Feedback fetch', err));
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl border-2 border-red-700"
              >
                No
              </button>
            </div>
            <button
              onClick={() => setShowTestModal(false)}
              className="mt-3 text-amber-600 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Thank you modal */}
      {showThankYou !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="cartoon-card p-6 max-w-sm w-full text-center">
            <p className="text-3xl mb-2">{showThankYou === 'yes' ? '🎉' : '🚢'}</p>
            <p className="text-lg font-bold text-amber-800 mb-2">
              {showThankYou === 'yes' ? 'Nailed it!' : 'Thanks for the feedback!'}
            </p>
            <p className="text-amber-700 mb-4">
              {showThankYou === 'yes'
                ? 'Glad we got it right! Have a great trip!'
                : "Sorry we missed it. Your feedback helps us get better!"}
            </p>
            <button
              onClick={() => setShowThankYou(null)}
              className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-2 px-6 rounded-xl border-2 border-amber-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 py-4 w-full space-y-4">
        {/* Map — promoted to top for instant visual context */}
        {vessels.length > 0 && (
          <CartoonMap vessels={vessels} />
        )}

        <CartoonLocationPermission
          onRequestPermission={requestAllPermissions}
          loading={geoLoading}
          permissionDenied={permissionDenied}
          hasLocation={hasLocation}
          error={geoError}
        />

        <PwaInstallBanner />

        {/* Terminal cards */}
        <div className={`grid gap-4 ${showSingleTerminal ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {(!showSingleTerminal || autoSelectedTerminal === 'cirkewwa') && (
            <CartoonTerminalCard
              terminal="cirkewwa"
              status={cirkewwaStatus}
              driveTime={driveTime.cirkewwa}
              driveTimeLoading={driveTime.loading}
              locationAvailable={hasLocation}
              ferryPrediction={cirkewwaFerryPrediction}
              queueData={portVehicleData.cirkewwa ?? undefined}
              nextDeparture={cirkewwaNextDeparture}
              isSelected={autoSelectedTerminal === 'cirkewwa'}
            />
          )}
          {(!showSingleTerminal || autoSelectedTerminal === 'mgarr') && (
            <CartoonTerminalCard
              terminal="mgarr"
              status={mgarrStatus}
              driveTime={driveTime.mgarr}
              driveTimeLoading={driveTime.loading}
              locationAvailable={hasLocation}
              ferryPrediction={mgarrFerryPrediction}
              queueData={portVehicleData.mgarr ?? undefined}
              nextDeparture={mgarrNextDeparture}
              isSelected={autoSelectedTerminal === 'mgarr'}
            />
          )}
        </div>

        {/* Toggle to show/hide both terminals */}
        {autoSelectedTerminal && (
          <div className="text-center">
            <button
              onClick={() => setShowBothTerminals((prev) => !prev)}
              className="bg-white bg-opacity-70 hover:bg-opacity-90 text-amber-800 font-medium text-sm px-4 py-2 rounded-full border border-amber-300 shadow-sm transition-all duration-200"
            >
              {showBothTerminals ? 'Show only my terminal' : 'View both terminals'}
            </button>
          </div>
        )}

        {/* Webcams — extracted from terminal cards */}
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
