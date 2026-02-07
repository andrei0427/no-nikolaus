import { Terminal, TerminalStatus, Vessel } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { DriveTimeDisplay } from './DriveTimeDisplay';

interface FerryPrediction {
  ferry: Vessel | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface TerminalPanelProps {
  terminal: Terminal;
  status: TerminalStatus | null;
  driveTime: number | null;
  driveTimeLoading: boolean;
  locationAvailable: boolean;
  ferryPrediction?: FerryPrediction;
}

const terminalNames: Record<Terminal, { name: string; subtitle: string }> = {
  cirkewwa: { name: 'Cirkewwa', subtitle: 'Malta' },
  mgarr: { name: 'Mgarr', subtitle: 'Gozo' },
};

const confidenceColors = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
};

export function TerminalPanel({
  terminal,
  status,
  driveTime,
  driveTimeLoading,
  locationAvailable,
  ferryPrediction,
}: TerminalPanelProps) {
  const { name, subtitle } = terminalNames[terminal];

  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">{name}</h2>
        <p className="text-slate-500 text-sm">{subtitle}</p>
      </div>

      {status ? (
        <StatusIndicator status={status.status} reason={status.reason} />
      ) : (
        <div className="text-slate-400 text-sm">Loading...</div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 w-full text-center">
        <DriveTimeDisplay
          driveTime={driveTime}
          loading={driveTimeLoading}
          locationAvailable={locationAvailable}
        />
      </div>

      {ferryPrediction?.ferry && (
        <div className="mt-3 pt-3 border-t border-slate-100 w-full text-center">
          <p className="text-xs text-slate-400 mb-1">Likely ferry on arrival</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-medium text-slate-700 text-sm">
              {ferryPrediction.ferry.name}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${confidenceColors[ferryPrediction.confidence]}`}
            >
              {ferryPrediction.confidence}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{ferryPrediction.reason}</p>
        </div>
      )}
    </div>
  );
}
