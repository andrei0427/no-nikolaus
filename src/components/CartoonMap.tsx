import { Vessel } from '../types';
import { FerryIcon } from './FerryIcon';
import { TERMINALS } from '../utils/constants';

interface CartoonMapProps {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  predictedNikolausPosition?: { lat: number; lon: number } | null;
}

// Calculate ferry position as percentage along the route (0 = Mgarr, 100 = Cirkewwa)
function getRoutePosition(lat: number, lon: number): number {
  const mgarrLat = TERMINALS.mgarr.lat;
  const mgarrLon = TERMINALS.mgarr.lon;
  const cirkewwaLat = TERMINALS.cirkewwa.lat;
  const cirkewwaLon = TERMINALS.cirkewwa.lon;

  // Calculate position along the diagonal route
  const totalDistLat = mgarrLat - cirkewwaLat;
  const totalDistLon = cirkewwaLon - mgarrLon;

  const progressLat = (mgarrLat - lat) / totalDistLat;
  const progressLon = (lon - mgarrLon) / totalDistLon;

  // Average of lat and lon progress for diagonal movement
  const progress = (progressLat + progressLon) / 2;

  return Math.max(0, Math.min(100, progress * 100));
}

// Consistent lane offsets for each ferry (perpendicular to route)
const ferryLaneOffset: Record<number, number> = {
  237593100: 0,    // Nikolaus - center
  248692000: -15,  // Ta' Pinu - left of center
  215145000: 15,   // Malita - right of center
  248928000: -8,   // Gaudos - slightly left
};

export function CartoonMap({ vessels, nikolaus, predictedNikolausPosition }: CartoonMapProps) {
  // Route endpoints (in percentage of container)
  // Mgarr (top-left) to Cirkewwa (bottom-right)
  const mgarrX = 25;
  const mgarrY = 12;
  const cirkewwaX = 75;
  const cirkewwaY = 88;

  // Calculate position along diagonal route
  const getPositionOnRoute = (progress: number, laneOffset: number = 0) => {
    const x = mgarrX + (cirkewwaX - mgarrX) * (progress / 100);
    const y = mgarrY + (cirkewwaY - mgarrY) * (progress / 100);

    // Apply perpendicular offset for lanes
    const angle = Math.atan2(cirkewwaY - mgarrY, cirkewwaX - mgarrX);
    const perpAngle = angle + Math.PI / 2;
    const offsetX = Math.cos(perpAngle) * laneOffset * 0.5;
    const offsetY = Math.sin(perpAngle) * laneOffset * 0.5;

    return { x: x + offsetX, y: y + offsetY };
  };

  return (
    <div className="cartoon-card p-4">
      <h3 className="text-xl font-bold text-center text-amber-900 mb-4 font-[Fredoka]">
        Ferry Tracker
      </h3>

      <div className="relative bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>

        {/* Gozo Island - Top Left - Higher fidelity shape */}
        <svg
          className="absolute"
          style={{ top: '-5%', left: '0%', width: '55%', height: '45%' }}
          viewBox="0 0 300 200"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="gozoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="3" stdDeviation="3" floodOpacity="0.3"/>
            </filter>
          </defs>
          {/* Gozo - More detailed coastline */}
          <path
            d="M80,140
               C60,135 45,125 40,110
               C35,95 40,80 50,70
               C60,60 75,52 95,48
               C115,44 140,42 165,45
               C190,48 210,55 225,65
               C240,75 250,88 252,102
               C254,116 248,130 235,140
               C222,150 205,156 185,158
               C165,160 145,158 125,155
               C105,152 90,148 80,140 Z

               M100,95 C95,90 98,82 105,80 C112,78 120,82 118,90 C116,98 105,100 100,95 Z"
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="3"
            filter="url(#gozoShadow)"
          />
          {/* Dwejra/Azure Window area indent */}
          <path
            d="M50,85 C45,82 42,78 45,74 C48,70 55,72 58,78 C61,84 55,88 50,85 Z"
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="2"
          />
          {/* Victoria/Rabat hill */}
          <ellipse cx="150" cy="95" rx="25" ry="15" fill="#C4956A" opacity="0.5" />
          {/* Gozo label */}
          <text x="150" y="105" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#5D4037" fontFamily="Fredoka, sans-serif">
            GOZO
          </text>
          {/* Mgarr Harbour - indentation on southeast */}
          <path
            d="M220,130 C225,125 235,128 238,135 C241,142 235,148 228,145 C221,142 215,135 220,130 Z"
            fill="#7CB9E8"
            stroke="#8B7355"
            strokeWidth="2"
          />
          {/* Mgarr terminal marker */}
          <circle cx="230" cy="138" r="8" fill="#C62828" stroke="white" strokeWidth="3" />
          <text x="230" y="165" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#5D4037">
            Mgarr
          </text>
        </svg>

        {/* Comino - Small island in between */}
        <svg
          className="absolute"
          style={{ top: '35%', left: '35%', width: '20%', height: '15%' }}
          viewBox="0 0 100 60"
          preserveAspectRatio="xMidYMid meet"
        >
          <ellipse
            cx="50" cy="30" rx="35" ry="20"
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="2"
            opacity="0.8"
          />
          <text x="50" y="35" textAnchor="middle" fontSize="10" fill="#5D4037" fontFamily="Fredoka, sans-serif">
            Comino
          </text>
        </svg>

        {/* Malta Island - Bottom Right - Higher fidelity shape (northern tip) */}
        <svg
          className="absolute"
          style={{ bottom: '-8%', right: '-5%', width: '65%', height: '50%' }}
          viewBox="0 0 350 220"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="maltaShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="3" stdDeviation="3" floodOpacity="0.3"/>
            </filter>
          </defs>
          {/* Malta northern region - Detailed coastline */}
          <path
            d="M40,80
               C30,90 25,105 30,120
               C35,135 50,150 70,162
               C90,174 115,182 145,188
               C175,194 210,196 245,192
               C280,188 305,178 320,162
               C335,146 340,125 335,105
               C330,85 315,70 295,60
               C275,50 250,45 220,44
               C190,43 160,46 130,52
               C100,58 75,68 55,78
               C45,83 40,80 40,80 Z

               M280,140 C290,145 295,155 290,162 C285,169 275,168 272,160 C269,152 270,135 280,140 Z"
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="3"
            filter="url(#maltaShadow)"
          />
          {/* Paradise Bay indent */}
          <path
            d="M75,95 C70,88 72,78 80,75 C88,72 95,78 92,88 C89,98 80,102 75,95 Z"
            fill="#7CB9E8"
            stroke="#8B7355"
            strokeWidth="2"
          />
          {/* Mellieha Bay */}
          <path
            d="M120,170 C130,175 145,178 160,176 C175,174 165,165 150,163 C135,161 110,165 120,170 Z"
            fill="#7CB9E8"
            stroke="#8B7355"
            strokeWidth="1.5"
          />
          {/* Hills */}
          <ellipse cx="200" cy="120" rx="40" ry="20" fill="#C4956A" opacity="0.4" />
          {/* Malta label */}
          <text x="200" y="130" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#5D4037" fontFamily="Fredoka, sans-serif">
            MALTA
          </text>
          {/* Cirkewwa terminal - northwest tip */}
          <circle cx="55" cy="85" r="8" fill="#C62828" stroke="white" strokeWidth="3" />
          <text x="55" y="65" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#5D4037">
            Cirkewwa
          </text>
        </svg>

        {/* Diagonal ferry route line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Route path */}
          <line
            x1={`${mgarrX}%`} y1={`${mgarrY}%`}
            x2={`${cirkewwaX}%`} y2={`${cirkewwaY}%`}
            stroke="url(#routeGradient)"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.4"
          />
          <line
            x1={`${mgarrX}%`} y1={`${mgarrY}%`}
            x2={`${cirkewwaX}%`} y2={`${cirkewwaY}%`}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="10,10"
            opacity="0.5"
          />
        </svg>

        {/* Animated waves along the channel */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[20, 35, 50, 65, 80].map((pos, i) => {
            const wavePos = getPositionOnRoute(pos, 0);
            return (
              <svg
                key={i}
                className={`absolute ${i % 2 === 0 ? 'animate-wave' : 'animate-wave-reverse'}`}
                style={{
                  left: `${wavePos.x - 10}%`,
                  top: `${wavePos.y - 2}%`,
                  width: '20%',
                  height: '4%',
                  opacity: 0.3 + (i % 3) * 0.1,
                }}
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,10 Q15,5 30,10 T60,10 T100,10"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                />
              </svg>
            );
          })}
        </div>

        {/* Ferries */}
        {vessels.map((vessel) => {
          const progress = getRoutePosition(vessel.LAT, vessel.LON);
          const laneOffset = ferryLaneOffset[vessel.MMSI] || 0;
          const pos = getPositionOnRoute(progress, laneOffset);
          const isNikolaus = vessel.isNikolaus;

          return (
            <div
              key={vessel.MMSI}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              <div className="flex flex-col items-center">
                <FerryIcon
                  name={vessel.name}
                  isNikolaus={isNikolaus}
                  size={isNikolaus ? 60 : 48}
                />
                <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap ${
                  isNikolaus
                    ? 'bg-red-600 text-white'
                    : 'bg-white bg-opacity-90 text-gray-800'
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
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 z-10"
            style={{
              left: `${getPositionOnRoute(getRoutePosition(predictedNikolausPosition.lat, predictedNikolausPosition.lon), 12).x}%`,
              top: `${getPositionOnRoute(getRoutePosition(predictedNikolausPosition.lat, predictedNikolausPosition.lon), 12).y}%`,
            }}
          >
            <div className="flex flex-col items-center">
              <FerryIcon name="Nikolaus" isNikolaus isGhost size={40} />
              <div className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600 bg-opacity-80 text-white whitespace-nowrap">
                Predicted
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 rounded-lg p-2 text-xs shadow-lg z-20">
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
