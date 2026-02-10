import { Vessel } from '../types';
import { FerryIcon } from './FerryIcon';
import { TERMINALS } from '../utils/constants';

interface CartoonMapProps {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  predictedNikolausPosition?: { lat: number; lon: number } | null;
}

// Calculate ferry position as percentage along the route (0 = Mgarr/top, 100 = Cirkewwa/bottom)
function getRoutePosition(lat: number): number {
  const mgarrLat = TERMINALS.mgarr.lat; // 36.025
  const cirkewwaLat = TERMINALS.cirkewwa.lat; // 35.989
  const range = mgarrLat - cirkewwaLat; // ~0.036

  // Clamp to route bounds
  const clampedLat = Math.max(cirkewwaLat, Math.min(mgarrLat, lat));
  const position = ((mgarrLat - clampedLat) / range) * 100;

  return Math.max(0, Math.min(100, position));
}

// Consistent horizontal positions for each ferry (by MMSI)
const ferryLanes: Record<number, number> = {
  237593100: 50,  // Nikolaus - center
  248692000: 30,  // Ta' Pinu - left
  215145000: 70,  // Malita - right
  248928000: 45,  // Gaudos - center-left
};

export function CartoonMap({ vessels, nikolaus, predictedNikolausPosition }: CartoonMapProps) {
  return (
    <div className="cartoon-card p-4">
      <h3 className="text-xl font-bold text-center text-amber-900 mb-4 font-[Fredoka]">
        Ferry Tracker
      </h3>

      <div className="relative bg-gradient-to-b from-sky-300 via-sky-400 to-sky-300 rounded-xl overflow-hidden" style={{ minHeight: '450px' }}>

        {/* Gozo Island - Actual shape */}
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <svg viewBox="0 0 200 80" className="w-64 h-20">
            {/* Simplified Gozo shape */}
            <path
              d="M40,60
                 C30,55 20,45 25,35
                 C30,25 45,20 60,18
                 C80,15 100,12 120,15
                 C140,18 155,22 165,30
                 C175,38 180,48 175,55
                 C170,62 155,65 140,63
                 C120,60 100,58 80,60
                 C60,62 50,63 40,60 Z"
              fill="#D4A574"
              stroke="#8B7355"
              strokeWidth="3"
            />
            {/* Gozo label */}
            <text x="100" y="38" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#5D4037" fontFamily="Fredoka, sans-serif">
              GOZO
            </text>
            {/* Mgarr terminal marker */}
            <circle cx="140" cy="55" r="6" fill="#C62828" stroke="white" strokeWidth="2" />
            <text x="140" y="72" textAnchor="middle" fontSize="8" fill="#5D4037" fontFamily="sans-serif">
              Mgarr
            </text>
          </svg>
        </div>

        {/* Malta Island - Actual shape (northern tip - Cirkewwa area) */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <svg viewBox="0 0 200 90" className="w-64 h-24">
            {/* Simplified Malta northern tip shape */}
            <path
              d="M30,30
                 C25,40 30,55 40,65
                 C55,78 75,85 100,85
                 C130,85 155,75 170,60
                 C180,50 175,35 165,28
                 C150,18 130,15 100,18
                 C70,21 50,25 40,28
                 C35,30 30,30 30,30 Z"
              fill="#D4A574"
              stroke="#8B7355"
              strokeWidth="3"
            />
            {/* Malta label */}
            <text x="100" y="55" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#5D4037" fontFamily="Fredoka, sans-serif">
              MALTA
            </text>
            {/* Cirkewwa terminal marker */}
            <circle cx="60" cy="35" r="6" fill="#C62828" stroke="white" strokeWidth="2" />
            <text x="60" y="22" textAnchor="middle" fontSize="8" fill="#5D4037" fontFamily="sans-serif">
              Cirkewwa
            </text>
          </svg>
        </div>

        {/* Sea with multiple wave layers */}
        <div className="absolute inset-0 pointer-events-none" style={{ top: '70px', bottom: '80px' }}>
          {/* Wave layer 1 */}
          <svg className="absolute w-full h-8 top-[10%] animate-wave opacity-40" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M0,10 Q25,5 50,10 T100,10 T150,10 T200,10" fill="none" stroke="white" strokeWidth="2" />
          </svg>
          {/* Wave layer 2 */}
          <svg className="absolute w-full h-8 top-[25%] animate-wave-reverse opacity-30" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M0,10 Q25,15 50,10 T100,10 T150,10 T200,10" fill="none" stroke="white" strokeWidth="3" />
          </svg>
          {/* Wave layer 3 */}
          <svg className="absolute w-full h-8 top-[40%] animate-wave opacity-35" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M0,12 Q30,6 60,12 T120,12 T180,12 T200,12" fill="none" stroke="#E1F5FE" strokeWidth="2" />
          </svg>
          {/* Wave layer 4 */}
          <svg className="absolute w-full h-8 top-[55%] animate-wave-reverse opacity-40" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M0,8 Q20,14 40,8 T80,8 T120,8 T160,8 T200,8" fill="none" stroke="white" strokeWidth="2" />
          </svg>
          {/* Wave layer 5 */}
          <svg className="absolute w-full h-8 top-[70%] animate-wave opacity-30" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M0,10 Q35,4 70,10 T140,10 T200,10" fill="none" stroke="#E1F5FE" strokeWidth="3" />
          </svg>
          {/* Wave layer 6 */}
          <svg className="absolute w-full h-8 top-[85%] animate-wave-reverse opacity-35" viewBox="0 0 200 20" preserveAspectRatio="none">
            <path d="M0,10 Q25,16 50,10 T100,10 T150,10 T200,10" fill="none" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        {/* Ferry channel area */}
        <div className="absolute" style={{ top: '80px', bottom: '90px', left: '10%', right: '10%' }}>
          {/* Ferries */}
          {vessels.map((vessel) => {
            const position = getRoutePosition(vessel.LAT);
            const isNikolaus = vessel.isNikolaus;
            const laneX = ferryLanes[vessel.MMSI] || 50;

            return (
              <div
                key={vessel.MMSI}
                className="absolute transform -translate-x-1/2 transition-all duration-1000 ease-in-out"
                style={{
                  left: `${laneX}%`,
                  top: `${position}%`,
                }}
              >
                <div className="flex flex-col items-center">
                  <FerryIcon
                    name={vessel.name}
                    isNikolaus={isNikolaus}
                    size={isNikolaus ? 65 : 50}
                  />
                  {/* Ferry label */}
                  <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap ${
                    isNikolaus
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-800'
                  }`}>
                    {vessel.name.replace('MV ', '')}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Predicted Nikolaus position (ghost) */}
          {predictedNikolausPosition && nikolaus && (
            <div
              className="absolute transform -translate-x-1/2 transition-all duration-1000"
              style={{
                left: '60%',
                top: `${getRoutePosition(predictedNikolausPosition.lat)}%`,
              }}
            >
              <div className="flex flex-col items-center">
                <FerryIcon name="Nikolaus" isNikolaus isGhost size={45} />
                <div className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-white opacity-70 whitespace-nowrap">
                  Predicted
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-24 right-2 bg-white bg-opacity-90 rounded-lg p-2 text-xs shadow-lg z-10">
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
      </div>
    </div>
  );
}
