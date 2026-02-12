import { useMemo } from 'react';
import { Terminal, TerminalStatus, Vessel, PortVehicleDetections } from '../types';
import { CartoonStatusBadge } from './CartoonStatusBadge';
import { estimateQueue } from '../utils/queueEstimate';

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

const terminalInfo: Record<Terminal, { name: string; island: string; lat: number; lon: number }> = {
  cirkewwa: { name: 'Ċirkewwa', island: 'Malta', lat: 35.989, lon: 14.329 },
  mgarr: { name: 'Mġarr', island: 'Gozo', lat: 36.025, lon: 14.299 },
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

  const queueEstimate = useMemo(() => {
    if (!queueData) return null;
    return estimateQueue(queueData, ferryPrediction?.ferry?.name ?? null);
  }, [queueData, ferryPrediction?.ferry?.name]);

  return (
    <div
      className={`cartoon-card p-4 transition-all duration-300 ${
        isSelected
          ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-sky-300 scale-[1.02]'
          : ''
      }`}
    >
      {/* Header: terminal name + drive time on same line */}
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-1.5">
          {isSelected && <span className="text-yellow-500 text-lg" title="Your departure terminal">★</span>}
          <h2 className="text-xl font-bold text-amber-900 font-[Fredoka]">
            {info.name}
          </h2>
          <span className="text-amber-600 text-sm">({info.island})</span>
        </div>
        {isSelected && (
          <div className="text-right shrink-0">
            {driveTimeLoading ? (
              <span className="text-sm text-amber-600 animate-pulse">...</span>
            ) : driveTime !== null ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${info.lat},${info.lon}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-800 hover:text-amber-600 font-bold text-sm transition-colors"
                title="Open in Google Maps"
              >
                ~{driveTime}m 🗺️
              </a>
            ) : locationAvailable ? (
              <span className="text-xs text-amber-500">—</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="mb-3">
        {status ? (
          <CartoonStatusBadge status={status.status} reason={status.reason} />
        ) : (
          <div className="text-center text-base text-amber-600 animate-pulse">
            Loading...
          </div>
        )}
      </div>

      {/* Ferry prediction — compact single line */}
      {ferryPrediction?.ferry && (
        <div className="flex items-center justify-between bg-white bg-opacity-60 rounded-lg px-3 py-2 border border-amber-200 mb-2">
          <span className="text-sm text-amber-700">
            Next: <strong className="text-amber-900">{ferryPrediction.ferry.name.replace('MV ', '')}</strong>
            {ferryPrediction.ferry.isNikolaus && <span className="text-red-600 font-bold"> (!)</span>}
          </span>
          {nextDeparture && (
            <span className="text-sm font-semibold text-amber-800">{nextDeparture}</span>
          )}
        </div>
      )}

      {/* Next departure when no ferry prediction */}
      {!ferryPrediction?.ferry && nextDeparture && (
        <div className="flex items-center justify-between bg-white bg-opacity-60 rounded-lg px-3 py-2 border border-amber-200 mb-2">
          <span className="text-sm text-amber-700">Next departure:</span>
          <span className="text-sm font-bold text-amber-900">{nextDeparture}</span>
        </div>
      )}

      {/* Queue — compact single line */}
      {queueData && queueEstimate && (
        <div className={`rounded-lg px-3 py-2 border ${
          queueEstimate.severity === 'high'
            ? 'bg-red-50 bg-opacity-80 border-red-300'
            : queueEstimate.severity === 'moderate'
              ? 'bg-orange-50 bg-opacity-80 border-orange-200'
              : 'bg-white bg-opacity-60 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700">Queue:</span>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <span>🚗 {queueData.car}</span>
              <span>🚛 {queueData.truck}</span>
              {queueData.motorbike > 0 && <span>🏍️ {queueData.motorbike}</span>}
            </div>
          </div>
          <div className={`text-xs mt-1 ${
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
    </div>
  );
}
