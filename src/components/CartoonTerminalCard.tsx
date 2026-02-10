import { Terminal, TerminalStatus, Vessel } from '../types';
import { CartoonStatusBadge } from './CartoonStatusBadge';
import { FerryIcon } from './FerryIcon';

interface FerryPrediction {
  ferry: Vessel | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface CartoonTerminalCardProps {
  terminal: Terminal;
  status: TerminalStatus | null;
  driveTime: number | null;
  driveTimeLoading: boolean;
  locationAvailable: boolean;
  ferryPrediction?: FerryPrediction;
  isSelected?: boolean;
  onClick?: () => void;
}

const terminalInfo: Record<Terminal, { name: string; island: string; emoji: string; color: string }> = {
  cirkewwa: { name: 'Cirkewwa', island: 'Malta', emoji: '🏝️', color: 'amber' },
  mgarr: { name: 'Mgarr', island: 'Gozo', emoji: '🌴', color: 'green' },
};

export function CartoonTerminalCard({
  terminal,
  status,
  driveTime,
  driveTimeLoading,
  locationAvailable,
  ferryPrediction,
  isSelected,
  onClick,
}: CartoonTerminalCardProps) {
  const info = terminalInfo[terminal];

  return (
    <div
      onClick={onClick}
      className={`cartoon-card p-5 cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-sky-300 scale-[1.02]'
          : 'hover:scale-[1.01]'
      }`}
    >
      {/* Terminal header */}
      <div className="text-center mb-4">
        <div className="inline-block bg-gradient-to-b from-amber-100 to-amber-200 px-4 py-2 rounded-xl border-2 border-amber-400 shadow-md">
          <h2 className="text-2xl font-bold text-amber-900 font-[Fredoka]">
            {info.emoji} {info.name}
          </h2>
          <p className="text-amber-700 text-sm font-medium">({info.island})</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="my-4">
        {status ? (
          <CartoonStatusBadge status={status.status} reason={status.reason} />
        ) : (
          <div className="text-center text-amber-600 animate-pulse">
            Loading...
          </div>
        )}
      </div>

      {/* Drive time */}
      <div className="bg-white bg-opacity-60 rounded-xl p-3 border-2 border-amber-300">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">🚗</span>
          {driveTimeLoading ? (
            <span className="text-amber-700 animate-pulse">Calculating...</span>
          ) : driveTime !== null ? (
            <span className="text-amber-900 font-bold text-lg">
              {driveTime} min drive
            </span>
          ) : locationAvailable ? (
            <span className="text-amber-600 text-sm">Unable to calculate</span>
          ) : (
            <span className="text-amber-600 text-sm">Enable location for drive time</span>
          )}
        </div>
      </div>

      {/* Likely ferry prediction */}
      {ferryPrediction?.ferry && (
        <div className="mt-4 bg-white bg-opacity-60 rounded-xl p-3 border-2 border-amber-300">
          <p className="text-xs text-amber-600 text-center mb-2">Likely ferry on arrival:</p>
          <div className="flex items-center justify-center gap-3">
            <FerryIcon
              name={ferryPrediction.ferry.name}
              isNikolaus={ferryPrediction.ferry.isNikolaus}
              size={45}
            />
            <div>
              <p className="font-bold text-amber-900 text-sm">
                {ferryPrediction.ferry.name}
                {ferryPrediction.ferry.isNikolaus && ' 😈'}
              </p>
              <p className="text-xs text-amber-700">{ferryPrediction.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="mt-4 bg-yellow-400 text-yellow-900 text-center py-2 rounded-xl font-bold text-sm border-2 border-yellow-600">
          ⭐ Your Departure Terminal ⭐
        </div>
      )}
    </div>
  );
}
