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

  const totalDistLat = mgarrLat - cirkewwaLat;
  const totalDistLon = cirkewwaLon - mgarrLon;

  const progressLat = (mgarrLat - lat) / totalDistLat;
  const progressLon = (lon - mgarrLon) / totalDistLon;

  const progress = (progressLat + progressLon) / 2;

  return Math.max(0, Math.min(100, progress * 100));
}

// Consistent lane offsets for each ferry (perpendicular to route)
const ferryLaneOffset: Record<number, number> = {
  237593100: 0,    // Nikolaus - center
  248692000: -12,  // Ta' Pinu - left of center
  215145000: 12,   // Malita - right of center
  248928000: -6,   // Gaudos - slightly left
};

// Traced from reference image - exact outlines
// Gozo - hexagonal shape with small harbour indent
const GOZO_PATH = `
  M 30,50
  L 15,35
  L 20,15
  L 50,5
  L 80,15
  L 90,40
  L 85,55
  L 75,58
  L 70,52
  L 65,58
  L 50,60
  L 30,50
  Z
`;

// Comino - small triangle
const COMINO_PATH = `
  M 10,5
  L 25,0
  L 25,15
  L 10,5
  Z
`;

// Malta - elongated shape with distinctive notches
const MALTA_PATH = `
  M 5,45
  L 0,60
  L 5,90
  L 25,100
  L 60,98
  L 85,90
  L 95,80
  L 90,75
  L 100,65
  L 95,55
  L 85,55
  L 80,45
  L 70,48
  L 65,42
  L 55,45
  L 50,38
  L 40,42
  L 30,35
  L 20,40
  L 15,35
  L 5,45
  Z
`;

export function CartoonMap({ vessels, nikolaus, predictedNikolausPosition }: CartoonMapProps) {
  // Route endpoints matching terminal positions on the islands
  const mgarrX = 28;
  const mgarrY = 22;
  const cirkewwaX = 42;
  const cirkewwaY = 48;

  const getPositionOnRoute = (progress: number, laneOffset: number = 0) => {
    const x = mgarrX + (cirkewwaX - mgarrX) * (progress / 100);
    const y = mgarrY + (cirkewwaY - mgarrY) * (progress / 100);

    const angle = Math.atan2(cirkewwaY - mgarrY, cirkewwaX - mgarrX);
    const perpAngle = angle + Math.PI / 2;
    const offsetX = Math.cos(perpAngle) * laneOffset * 0.3;
    const offsetY = Math.sin(perpAngle) * laneOffset * 0.3;

    return { x: x + offsetX, y: y + offsetY };
  };

  return (
    <div className="cartoon-card p-4">
      <h3 className="text-xl font-bold text-center text-amber-900 mb-4 font-[Fredoka]">
        Ferry Tracker
      </h3>

      <div className="relative bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="islandShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodOpacity="0.3"/>
            </filter>
            <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8D4B8" />
              <stop offset="100%" stopColor="#D4A574" />
            </linearGradient>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Ferry route */}
          <line
            x1={mgarrX} y1={mgarrY}
            x2={cirkewwaX} y2={cirkewwaY}
            stroke="url(#routeGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.6"
          />
          <line
            x1={mgarrX} y1={mgarrY}
            x2={cirkewwaX} y2={cirkewwaY}
            stroke="white"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            opacity="0.7"
          />

          {/* Gozo - top left */}
          <g transform="translate(5, 3) scale(0.28)">
            <path
              d={GOZO_PATH}
              fill="url(#landGradient)"
              stroke="#8B7355"
              strokeWidth="2"
              filter="url(#islandShadow)"
            />
          </g>
          <text
            x="18" y="14"
            textAnchor="middle"
            fontSize="4"
            fontWeight="bold"
            fill="#5D4037"
            fontFamily="Fredoka, sans-serif"
          >
            GOZO
          </text>

          {/* Mgarr terminal */}
          <circle cx={mgarrX} cy={mgarrY} r="2" fill="#C62828" stroke="white" strokeWidth="0.8" />
          <text
            x={mgarrX + 4} y={mgarrY + 1}
            fontSize="2.5"
            fontWeight="bold"
            fill="#5D4037"
          >
            Mġarr
          </text>

          {/* Comino - small triangle between islands */}
          <g transform="translate(30, 28) scale(0.12)">
            <path
              d={COMINO_PATH}
              fill="url(#landGradient)"
              stroke="#8B7355"
              strokeWidth="2"
              filter="url(#islandShadow)"
            />
          </g>

          {/* Malta - bottom right */}
          <g transform="translate(32, 38) scale(0.62)">
            <path
              d={MALTA_PATH}
              fill="url(#landGradient)"
              stroke="#8B7355"
              strokeWidth="1.5"
              filter="url(#islandShadow)"
            />
          </g>
          <text
            x="62" y="75"
            textAnchor="middle"
            fontSize="5"
            fontWeight="bold"
            fill="#5D4037"
            fontFamily="Fredoka, sans-serif"
          >
            MALTA
          </text>

          {/* Cirkewwa terminal */}
          <circle cx={cirkewwaX} cy={cirkewwaY} r="2" fill="#C62828" stroke="white" strokeWidth="0.8" />
          <text
            x={cirkewwaX - 1} y={cirkewwaY + 5}
            fontSize="2.5"
            fontWeight="bold"
            fill="#5D4037"
            textAnchor="middle"
          >
            Ċirkewwa
          </text>

          {/* Static waves scattered across the sea */}
          {[
            // Around Gozo
            { x: 8, y: 6 }, { x: 3, y: 15 }, { x: 12, y: 24 },
            // Channel area
            { x: 25, y: 30 }, { x: 35, y: 35 }, { x: 30, y: 42 },
            // Around Comino
            { x: 38, y: 26 }, { x: 42, y: 32 },
            // Around Malta - top
            { x: 50, y: 42 }, { x: 58, y: 38 }, { x: 68, y: 44 },
            // Around Malta - right side
            { x: 88, y: 52 }, { x: 92, y: 65 }, { x: 95, y: 78 }, { x: 85, y: 88 },
            // Around Malta - bottom
            { x: 70, y: 95 }, { x: 55, y: 92 }, { x: 42, y: 88 },
            // Left side of map
            { x: 5, y: 45 }, { x: 8, y: 60 }, { x: 12, y: 75 }, { x: 18, y: 88 },
            // Top right
            { x: 75, y: 8 }, { x: 88, y: 15 }, { x: 92, y: 28 },
            // Extra scattered
            { x: 22, y: 55 }, { x: 28, y: 68 }, { x: 15, y: 38 },
          ].map((pos, i) => (
            <path
              key={i}
              d={`M ${pos.x - 3},${pos.y} q 1.5,-1.2 3,0 t 3,0`}
              fill="none"
              stroke="white"
              strokeWidth="0.5"
              opacity={0.3 + (i % 3) * 0.1}
            />
          ))}
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
                  size={isNikolaus ? 56 : 44}
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
              left: `${getPositionOnRoute(getRoutePosition(predictedNikolausPosition.lat, predictedNikolausPosition.lon), 10).x}%`,
              top: `${getPositionOnRoute(getRoutePosition(predictedNikolausPosition.lat, predictedNikolausPosition.lon), 10).y}%`,
            }}
          >
            <div className="flex flex-col items-center">
              <FerryIcon name="Nikolaus" isNikolaus isGhost size={36} />
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
