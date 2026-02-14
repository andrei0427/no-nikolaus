import { Terminal } from '../types';

interface TripBannerProps {
  terminal: Terminal;
  driveTime: number | null;
  onEndTrip: () => void;
}

const terminalNames: Record<Terminal, string> = {
  cirkewwa: 'Cirkewwa',
  mgarr: 'Mgarr',
};

export function TripBanner({ terminal, driveTime, onEndTrip }: TripBannerProps) {
  return (
    <div className="bg-blue-600 bg-opacity-90 border-b-2 border-blue-400">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            Trip to {terminalNames[terminal]}
            {driveTime !== null && ` — ~${driveTime}m drive`}
          </span>
        </div>
        <button
          onClick={onEndTrip}
          className="text-blue-200 hover:text-white text-sm font-medium transition-colors px-2 py-0.5 rounded hover:bg-blue-500"
        >
          End trip
        </button>
      </div>
    </div>
  );
}
