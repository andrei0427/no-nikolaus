import { FerryIcon } from './FerryIcon';

interface CartoonHeaderProps {
  connected: boolean;
  lastUpdate: Date | null;
}

export function CartoonHeader({ connected, lastUpdate }: CartoonHeaderProps) {
  return (
    <header className="bg-gradient-to-b from-amber-100 to-amber-200 border-b-4 border-amber-400 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Title row */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <FerryIcon name="Nikolaus" isNikolaus size={50} />
          <h1
            className="text-3xl md:text-4xl font-bold text-amber-900 drop-shadow-lg"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            WHERE'S NIKOLAUS?
          </h1>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1.5 shrink-0" title={
            connected
              ? `Live${lastUpdate ? ` — updated ${lastUpdate.toLocaleTimeString()}` : ''}`
              : 'Connecting...'
          }>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-amber-600">
              {connected ? 'Live' : '...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
