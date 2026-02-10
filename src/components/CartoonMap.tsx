import { Vessel } from '../types';
import { FerryIcon } from './FerryIcon';
import { TERMINALS } from '../utils/constants';

interface CartoonMapProps {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  predictedNikolausPosition?: { lat: number; lon: number } | null;
}

// Calculate ferry position as percentage along the route (0 = Mgarr, 100 = Cirkewwa)
function getRoutePosition(lat: number): number {
  const mgarrLat = TERMINALS.mgarr.lat; // 36.025
  const cirkewwaLat = TERMINALS.cirkewwa.lat; // 35.989
  const range = mgarrLat - cirkewwaLat; // ~0.036

  // Clamp to route bounds
  const clampedLat = Math.max(cirkewwaLat, Math.min(mgarrLat, lat));
  const position = ((mgarrLat - clampedLat) / range) * 100;

  return Math.max(5, Math.min(95, position)); // Keep within bounds
}

export function CartoonMap({ vessels, nikolaus, predictedNikolausPosition }: CartoonMapProps) {
  return (
    <div className="cartoon-card p-4">
      <h3 className="text-xl font-bold text-center text-amber-900 mb-4 font-[Fredoka]">
        Ferry Tracker
      </h3>

      <div className="relative bg-gradient-to-b from-sky-200 via-sky-300 to-sky-200 rounded-xl p-4 min-h-[400px]">
        {/* Gozo Island */}
        <div className="absolute top-2 left-4 right-4">
          <div className="bg-green-600 rounded-2xl p-3 border-4 border-green-800 shadow-lg relative">
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-green-800" />
            </div>
            <p className="text-white font-bold text-center text-lg font-[Fredoka]">GOZO</p>
            <p className="text-green-200 text-center text-xs">Mgarr Terminal</p>
          </div>
        </div>

        {/* Malta Island */}
        <div className="absolute bottom-2 left-4 right-4">
          <div className="bg-amber-600 rounded-2xl p-3 border-4 border-amber-800 shadow-lg relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-amber-800" />
            </div>
            <p className="text-white font-bold text-center text-lg font-[Fredoka]">MALTA</p>
            <p className="text-amber-200 text-center text-xs">Cirkewwa Terminal</p>
          </div>
        </div>

        {/* Sea route line */}
        <div className="absolute left-1/2 top-20 bottom-20 w-1 bg-blue-400 opacity-50 transform -translate-x-1/2">
          {/* Dashed line effect */}
          <div className="h-full w-full" style={{
            background: 'repeating-linear-gradient(to bottom, #60A5FA 0px, #60A5FA 10px, transparent 10px, transparent 20px)'
          }} />
        </div>

        {/* Terminal dots */}
        <div className="absolute left-1/2 top-16 transform -translate-x-1/2">
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg" />
        </div>
        <div className="absolute left-1/2 bottom-16 transform -translate-x-1/2">
          <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow-lg" />
        </div>

        {/* Ferries */}
        {vessels.map((vessel) => {
          const position = getRoutePosition(vessel.LAT);
          const isNikolaus = vessel.isNikolaus;

          return (
            <div
              key={vessel.MMSI}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
              style={{
                left: isNikolaus ? '50%' : `${30 + Math.random() * 40}%`,
                top: `${12 + (position * 0.76)}%`, // Scale to fit between islands
              }}
            >
              <div className="relative group">
                <FerryIcon
                  name={vessel.name}
                  isNikolaus={isNikolaus}
                  size={isNikolaus ? 70 : 55}
                />
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap z-10">
                  <span className="font-bold">{vessel.name}</span>
                  <br />
                  <span className="text-gray-600">{vessel.state.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Predicted Nikolaus position (ghost) */}
        {predictedNikolausPosition && nikolaus && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: '65%',
              top: `${12 + (getRoutePosition(predictedNikolausPosition.lat) * 0.76)}%`,
            }}
          >
            <div className="relative">
              <FerryIcon name="Nikolaus" isNikolaus isGhost size={50} />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white bg-gray-800 bg-opacity-70 px-2 py-0.5 rounded whitespace-nowrap">
                Predicted
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-24 right-2 bg-white bg-opacity-90 rounded-lg p-2 text-xs shadow-lg">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-red-600">😈</span>
            <span className="font-bold text-red-800">Nikolaus</span>
          </div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-blue-600">😊</span>
            <span className="text-gray-700">Other ferries</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">👻</span>
            <span className="text-gray-500">Predicted</span>
          </div>
        </div>

        {/* Decorative waves */}
        <div className="absolute inset-x-0 top-1/3 opacity-20">
          <svg viewBox="0 0 100 20" className="w-full h-8">
            <path
              d="M0,10 Q25,5 50,10 T100,10"
              fill="none"
              stroke="white"
              strokeWidth="2"
              className="animate-wave"
            />
          </svg>
        </div>
        <div className="absolute inset-x-0 top-2/3 opacity-20">
          <svg viewBox="0 0 100 20" className="w-full h-8">
            <path
              d="M0,10 Q25,15 50,10 T100,10"
              fill="none"
              stroke="white"
              strokeWidth="2"
              className="animate-wave-reverse"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
