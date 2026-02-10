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

// Simplified but geographically accurate island paths
// Based on actual Malta archipelago outlines
const GOZO_PATH = `
  M 45,65
  C 35,60 28,50 30,38
  C 32,28 42,20 55,16
  C 68,12 85,10 100,12
  C 115,14 128,20 138,28
  C 148,36 155,48 154,60
  C 153,72 145,82 132,88
  L 128,86
  C 130,82 128,76 122,74
  C 116,72 110,76 112,82
  L 108,88
  C 95,92 78,92 62,88
  C 50,84 42,76 45,65
  Z
`;

const COMINO_PATH = `
  M 50,25
  C 42,22 35,28 32,38
  C 29,48 35,58 45,62
  C 55,66 68,64 75,55
  C 82,46 80,32 70,26
  C 62,21 55,23 50,25
  Z
`;

const MALTA_PATH = `
  M 25,30
  C 18,35 15,45 18,55
  L 16,58
  C 12,56 8,60 10,66
  C 12,72 18,74 22,70
  L 25,72
  C 28,82 38,92 52,98
  C 66,104 85,108 105,108
  C 125,108 145,104 162,96
  C 179,88 192,76 198,62
  C 204,48 202,34 192,24
  C 182,14 165,8 145,6
  C 125,4 105,6 85,12
  C 65,18 48,28 38,38
  L 35,35
  C 38,30 34,24 28,24
  C 22,24 18,30 22,36
  L 25,30
  Z
`;

export function CartoonMap({ vessels, nikolaus, predictedNikolausPosition }: CartoonMapProps) {
  // Route endpoints (in percentage of container)
  // Mgarr (top-left) to Cirkewwa (bottom-right)
  const mgarrX = 28;
  const mgarrY = 18;
  const cirkewwaX = 72;
  const cirkewwaY = 82;

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

        {/* Single SVG for all islands */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="islandShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.3"/>
            </filter>
            <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8D4B8" />
              <stop offset="100%" stopColor="#D4A574" />
            </linearGradient>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Ferry route */}
          <line
            x1={mgarrX} y1={mgarrY}
            x2={cirkewwaX} y2={cirkewwaY}
            stroke="url(#routeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.5"
          />
          <line
            x1={mgarrX} y1={mgarrY}
            x2={cirkewwaX} y2={cirkewwaY}
            stroke="white"
            strokeWidth="0.8"
            strokeDasharray="3,3"
            opacity="0.6"
          />

          {/* Gozo - Top left */}
          <g transform="translate(-5, -12) scale(0.55)">
            <path
              d={GOZO_PATH}
              fill="url(#landGradient)"
              stroke="#8B7355"
              strokeWidth="1.5"
              filter="url(#islandShadow)"
            />
            <text
              x="90" y="55"
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#5D4037"
              fontFamily="Fredoka, sans-serif"
            >
              GOZO
            </text>
          </g>

          {/* Mgarr terminal marker */}
          <circle cx={mgarrX} cy={mgarrY} r="3" fill="#C62828" stroke="white" strokeWidth="1.5" />
          <text
            x={mgarrX} y={mgarrY - 5}
            textAnchor="middle"
            fontSize="4"
            fontWeight="bold"
            fill="#5D4037"
          >
            Mgarr
          </text>

          {/* Comino - Center */}
          <g transform="translate(38, 32) scale(0.18)">
            <path
              d={COMINO_PATH}
              fill="url(#landGradient)"
              stroke="#8B7355"
              strokeWidth="2"
              filter="url(#islandShadow)"
            />
            <text
              x="50" y="48"
              textAnchor="middle"
              fontSize="22"
              fill="#5D4037"
              fontFamily="Fredoka, sans-serif"
            >
              Comino
            </text>
          </g>

          {/* Malta - Bottom right */}
          <g transform="translate(42, 48) scale(0.6)">
            <path
              d={MALTA_PATH}
              fill="url(#landGradient)"
              stroke="#8B7355"
              strokeWidth="1.5"
              filter="url(#islandShadow)"
            />
            <text
              x="105" y="60"
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#5D4037"
              fontFamily="Fredoka, sans-serif"
            >
              MALTA
            </text>
          </g>

          {/* Cirkewwa terminal marker */}
          <circle cx={cirkewwaX} cy={cirkewwaY} r="3" fill="#C62828" stroke="white" strokeWidth="1.5" />
          <text
            x={cirkewwaX} y={cirkewwaY + 7}
            textAnchor="middle"
            fontSize="4"
            fontWeight="bold"
            fill="#5D4037"
          >
            Cirkewwa
          </text>

          {/* Animated waves */}
          {[25, 40, 55, 70].map((pos, i) => {
            const wavePos = getPositionOnRoute(pos, 0);
            return (
              <g key={i} className={i % 2 === 0 ? 'animate-wave' : 'animate-wave-reverse'}>
                <path
                  d={`M ${wavePos.x - 6},${wavePos.y} q 3,-2 6,0 t 6,0`}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.8"
                  opacity={0.4 + (i % 2) * 0.2}
                />
              </g>
            );
          })}
        </svg>

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
