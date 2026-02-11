import { useMemo, useState } from 'react';
import { Terminal, TerminalStatus, Vessel, PortVehicleDetections } from '../types';
import { CartoonStatusBadge } from './CartoonStatusBadge';
import { FerryIcon } from './FerryIcon';
import { estimateQueue } from '../utils/queueEstimate';

interface Camera {
  name: string;
  url: string;
}

const terminalCameras: Record<Terminal, Camera[]> = {
  mgarr: [
    { name: 'Marshalling Area (Front)', url: 'https://www.ipcamlive.com/player/player.php?alias=5975bfa3e7f2d&autoplay=1' },
    { name: 'Shore Street (Upper)', url: 'https://g0.ipcamlive.com/player/player.php?alias=598d6542f2f4d' },
    { name: 'Shore Street (Middle)', url: 'https://g0.ipcamlive.com/player/player.php?alias=6110f4b30ec0d' },
    { name: 'Shore Street (Lower)', url: 'https://www.ipcamlive.com/player/player.php?alias=5979b0b2141aa&autoplay=1' },
    { name: 'Mġarr Road', url: 'https://g0.ipcamlive.com/player/player.php?alias=598d64ffc350e' },
  ],
  cirkewwa: [
    { name: 'Marshalling Area (Front)', url: 'https://www.ipcamlive.com/player/player.php?alias=5ff3216215c7c&autoplay=1' },
    { name: 'Marshalling Area (Side)', url: 'https://www.ipcamlive.com/player/player.php?alias=5ff327ab87fd7&autoplay=1' },
  ],
};

interface FerryPrediction {
  ferry: Vessel | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  departureTime: string | null;
}

interface CartoonTerminalCardProps {
  terminal: Terminal;
  status: TerminalStatus | null;
  driveTime: number | null;
  driveTimeLoading: boolean;
  locationAvailable: boolean;
  ferryPrediction?: FerryPrediction;
  queueData?: PortVehicleDetections;
  nextDeparture?: string | null;
  isSelected?: boolean;
}

const terminalInfo: Record<Terminal, { name: string; island: string; color: string; lat: number; lon: number }> = {
  cirkewwa: { name: 'Ċirkewwa', island: 'Malta', color: 'amber', lat: 35.989, lon: 14.329 },
  mgarr: { name: 'Mġarr', island: 'Gozo', color: 'green', lat: 36.025, lon: 14.299 },
};

export function CartoonTerminalCard({
  terminal,
  status,
  driveTime,
  driveTimeLoading,
  locationAvailable,
  ferryPrediction,
  queueData,
  nextDeparture,
  isSelected,
}: CartoonTerminalCardProps) {
  const info = terminalInfo[terminal];
  const cameras = terminalCameras[terminal];
  const [activeCamera, setActiveCamera] = useState<string | null>(null);

  const queueEstimate = useMemo(() => {
    if (!queueData) return null;
    return estimateQueue(queueData, ferryPrediction?.ferry?.name ?? null);
  }, [queueData, ferryPrediction?.ferry?.name]);

  return (
    <div
      className={`cartoon-card p-5 transition-all duration-300 ${
        isSelected
          ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-sky-300 scale-[1.02]'
          : ''
      }`}
    >
      {/* Terminal header */}
      <div className="text-center mb-4">
        <div className="inline-block bg-gradient-to-b from-amber-100 to-amber-200 px-4 py-2 rounded-xl border-2 border-amber-400 shadow-md">
          <h2 className="text-3xl font-bold text-amber-900 font-[Fredoka]">
            {info.name}
          </h2>
          <p className="text-amber-700 text-base font-medium">({info.island})</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="my-4">
        {status ? (
          <CartoonStatusBadge status={status.status} reason={status.reason} />
        ) : (
          <div className="text-center text-lg text-amber-600 animate-pulse">
            Loading...
          </div>
        )}
      </div>

      {/* Drive time */}
      <div className="bg-white bg-opacity-60 rounded-xl p-3 border-2 border-amber-300">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl font-bold text-amber-700">Drive:</span>
          {driveTimeLoading ? (
            <span className="text-xl text-amber-700 animate-pulse">Calculating...</span>
          ) : driveTime !== null ? (
            <>
              <span className="text-amber-900 font-bold text-xl">
                ~{driveTime} min
              </span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${info.lat},${info.lon}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:text-amber-800 transition-colors"
                aria-label="Open route in Google Maps"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </>
          ) : locationAvailable ? (
            <span className="text-amber-600 text-base">Unable to calculate</span>
          ) : (
            <span className="text-amber-600 text-base">Enable location for drive time</span>
          )}
        </div>
        {driveTime !== null && (
          <p className="text-xs italic text-amber-600 text-center mt-1">Estimate, does not factor in traffic</p>
        )}
      </div>

      {/* Port queue */}
      {queueData && queueEstimate && (
        <div className={`mt-4 rounded-xl p-3 border-2 ${
          queueEstimate.severity === 'high'
            ? 'bg-red-50 bg-opacity-80 border-red-400'
            : queueEstimate.severity === 'moderate'
              ? 'bg-orange-50 bg-opacity-80 border-orange-300'
              : 'bg-white bg-opacity-60 border-amber-300'
        }`}>
          <p className="text-sm text-amber-600 text-center mb-2">Vehicles in queue:</p>
          <div className="flex items-center justify-center gap-4 text-amber-900 font-bold text-lg">
            <span>🚗 {queueData.car}</span>
            <span>🚛 {queueData.truck}</span>
            {queueData.motorbike > 0 && <span>🏍️ {queueData.motorbike}</span>}
          </div>
          <div className={`mt-2 text-center text-sm font-semibold ${
            queueEstimate.severity === 'high'
              ? 'text-red-700'
              : queueEstimate.severity === 'moderate'
                ? 'text-orange-700'
                : 'text-green-700'
          }`}>
            {queueEstimate.severity === 'high' && '⚠️ '}
            {queueEstimate.message}
          </div>
        </div>
      )}

      {/* Likely ferry prediction */}
      {ferryPrediction?.ferry && (
        <div className="mt-4 bg-white bg-opacity-60 rounded-xl p-3 border-2 border-amber-300">
          <p className="text-sm text-amber-600 text-center mb-2">Likely ferry on arrival:</p>
          <div className="flex items-center justify-center gap-3">
            <FerryIcon
              name={ferryPrediction.ferry.name}
              isNikolaus={ferryPrediction.ferry.isNikolaus}
              size={80}
            />
            <div>
              <p className="font-bold text-amber-900 text-lg">
                {ferryPrediction.ferry.name}
                {ferryPrediction.ferry.isNikolaus && ' (!)'}
              </p>
              <p className="text-sm text-amber-700">{ferryPrediction.reason}</p>
              {nextDeparture && (
                <p className="text-sm text-amber-800 font-semibold mt-1">
                  Next scheduled: {nextDeparture}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next departure (when no ferry prediction available) */}
      {!ferryPrediction?.ferry && nextDeparture && (
        <div className="mt-4 bg-white bg-opacity-60 rounded-xl p-3 border-2 border-amber-300">
          <div className="text-center">
            <p className="text-sm text-amber-600 mb-1">Next scheduled departure:</p>
            <p className="text-xl font-bold text-amber-900">{nextDeparture}</p>
          </div>
        </div>
      )}

      {/* Webcams */}
      <div className="mt-4 bg-white bg-opacity-60 rounded-xl p-3 border-2 border-amber-300">
        <p className="text-sm text-amber-600 text-center mb-2">Webcams:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {cameras.map((cam) => (
            <button
              key={cam.url}
              onClick={() => setActiveCamera(activeCamera === cam.url ? null : cam.url)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                activeCamera === cam.url
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
              }`}
            >
              {cam.name}
            </button>
          ))}
        </div>
        {activeCamera && (
          <div className="mt-3 relative">
            <button
              onClick={() => setActiveCamera(null)}
              className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold hover:bg-opacity-70 transition-colors"
              aria-label="Close webcam"
            >
              ✕
            </button>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={activeCamera}
                className="absolute inset-0 w-full h-full rounded-lg"
                allow="autoplay"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="mt-4 bg-yellow-400 text-yellow-900 text-center py-2 rounded-xl font-bold text-base border-2 border-yellow-600">
          Your Departure Terminal
        </div>
      )}
    </div>
  );
}
