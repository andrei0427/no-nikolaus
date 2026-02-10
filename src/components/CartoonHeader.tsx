import { FerryIcon } from './FerryIcon';

interface CartoonHeaderProps {
  connected: boolean;
  lastUpdate: Date | null;
}

export function CartoonHeader({ connected, lastUpdate }: CartoonHeaderProps) {
  return (
    <header className="relative bg-gradient-to-b from-amber-100 to-amber-200 border-b-4 border-amber-400 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center">
          {/* Title with evil ferry */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <FerryIcon name="Nikolaus" isNikolaus size={50} />
            <h1
              className="text-4xl md:text-5xl font-bold text-amber-900 drop-shadow-lg"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
            >
              NO NIKOLAUS!
            </h1>
            <FerryIcon name="Nikolaus" isNikolaus size={50} className="scale-x-[-1]" />
          </div>

          {/* Tagline */}
          <p className="text-amber-700 text-lg italic font-medium">
            "Avoid the ferry of doom!"
          </p>

          {/* Connection status */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-amber-700">
              {connected ? 'Live tracking active' : 'Connecting...'}
              {lastUpdate && connected && (
                <span className="text-amber-500 ml-2">
                  (updated {lastUpdate.toLocaleTimeString()})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Decorative wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0 transform translate-y-1/2 overflow-hidden h-4">
        <svg viewBox="0 0 1200 20" className="w-full" preserveAspectRatio="none">
          <path
            d="M0,10 C150,20 300,0 450,10 C600,20 750,0 900,10 C1050,20 1200,0 1200,10 L1200,20 L0,20 Z"
            fill="#4FC3F7"
          />
        </svg>
      </div>
    </header>
  );
}
