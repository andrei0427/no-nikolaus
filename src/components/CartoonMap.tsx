import { Vessel, VesselState } from '../types';
import { FerryIcon } from './FerryIcon';
import { TERMINALS } from '../utils/constants';
import {
  GOZO_PATH, COMINO_PATH, MALTA_PATH,
  VB_W, VB_H, MAP_VIEWBOX,
  MGARR_SVG, CIRKEWWA_SVG, svgToPercent,
} from './islandPaths';

// Ferry icon rotation based on direction of travel.
// Route goes Mgarr (upper-left) → Cirkewwa (lower-right) at ~45°.
// Towards Cirkewwa: rotate(45deg). Towards Mgarr: mirror + same rotation.
function ferryTransform(state: VesselState): string {
  const towardsCirkewwa =
    state === 'EN_ROUTE_TO_CIRKEWWA' || state === 'DOCKED_MGARR';
  return towardsCirkewwa
    ? 'rotate(45deg) scaleX(-1)'
    : 'rotate(45deg)';
}

interface CartoonMapProps {
  vessels: Vessel[];
}

// Calculate ferry position as percentage along the route (0 = Mgarr, 100 = Cirkewwa)
// Snaps docked ferries to their terminal so they don't appear mid-route
function getRoutePosition(vessel: Vessel): number {
  if (vessel.state === 'DOCKED_MGARR') return 0;
  if (vessel.state === 'DOCKED_CIRKEWWA') return 100;

  const mgarrLat = TERMINALS.mgarr.lat;
  const mgarrLon = TERMINALS.mgarr.lon;
  const cirkewwaLat = TERMINALS.cirkewwa.lat;
  const cirkewwaLon = TERMINALS.cirkewwa.lon;

  const totalDistLat = mgarrLat - cirkewwaLat;
  const totalDistLon = cirkewwaLon - mgarrLon;

  const progressLat = (mgarrLat - vessel.LAT) / totalDistLat;
  const progressLon = (vessel.LON - mgarrLon) / totalDistLon;

  const progress = (progressLat + progressLon) / 2;

  return Math.max(0, Math.min(100, progress * 100));
}

// Two fixed tracks (perpendicular offset from route center):
const TRACK_NIKOLAUS = 0;       // center
const TRACK_OTHERS = 18;        // right of center
const TRACK_OTHERS_SPREAD = 16; // extra spread between overlapping others
const OVERLAP_THRESHOLD = 15;   // route % within which others spread apart

// Route endpoints in percentage of container (derived from SVG coords)
const mgarrPercent = svgToPercent(MGARR_SVG.x, MGARR_SVG.y);
const cirkewwaPercent = svgToPercent(CIRKEWWA_SVG.x, CIRKEWWA_SVG.y);

export function CartoonMap({ vessels }: CartoonMapProps) {
  const mgarrX = mgarrPercent.x;
  const mgarrY = mgarrPercent.y;
  const cirkewwaX = cirkewwaPercent.x;
  const cirkewwaY = cirkewwaPercent.y;

  const getPositionOnRoute = (progress: number, laneOffset: number = 0) => {
    const x = mgarrX + (cirkewwaX - mgarrX) * (progress / 100);
    const y = mgarrY + (cirkewwaY - mgarrY) * (progress / 100);

    const angle = Math.atan2(cirkewwaY - mgarrY, cirkewwaX - mgarrX);
    const perpAngle = angle + Math.PI / 2;
    const offsetX = Math.cos(perpAngle) * laneOffset * 0.5;
    const offsetY = Math.sin(perpAngle) * laneOffset * 0.5;

    return { x: x + offsetX, y: y + offsetY };
  };

  return (
    <div className="cartoon-card p-4">
      <h3 className="text-2xl font-bold text-center text-amber-900 mb-4 font-[Fredoka]">
        Ferry Tracker
      </h3>

      <div
        className="relative bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 rounded-xl overflow-hidden"
        style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
      >
        {/* Single SVG with islands, route, and markers */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={MAP_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="islandShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="5" dy="5" stdDeviation="5" floodOpacity="0.3"/>
            </filter>
          </defs>

          {/* Gozo */}
          <path
            d={GOZO_PATH}
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="5"
            filter="url(#islandShadow)"
          />

          {/* Comino */}
          <path
            d={COMINO_PATH}
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="5"
            filter="url(#islandShadow)"
          />

          {/* Malta */}
          <path
            d={MALTA_PATH}
            fill="#D4A574"
            stroke="#8B7355"
            strokeWidth="5"
            filter="url(#islandShadow)"
          />
        </svg>

        {/* Sea waves scattered around the islands */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            // Open-water positions for viewBox 260 350 760 580
            // Gozo ≈ x:2-73% y:5-61%, Malta NW ≈ x:71%+ y:73%+
            // NE of Gozo (upper-right sea)
            { x: 78, y: 5, w: 5, anim: false },
            { x: 85, y: 12, w: 6, anim: false },
            { x: 92, y: 8, w: 5, anim: true },
            { x: 76, y: 20, w: 6, anim: false },
            { x: 88, y: 25, w: 5, anim: false },
            { x: 82, y: 35, w: 6, anim: false },
            { x: 93, y: 42, w: 5, anim: true },
            { x: 78, y: 50, w: 6, anim: false },
            { x: 86, y: 55, w: 5, anim: false },
            { x: 90, y: 65, w: 5, anim: false },
            // Channel between islands
            { x: 48, y: 66, w: 6, anim: false },
            { x: 55, y: 72, w: 5, anim: true },
            { x: 42, y: 74, w: 6, anim: false },
            { x: 60, y: 78, w: 5, anim: false },
            { x: 50, y: 82, w: 6, anim: false },
            // South of Gozo (SW sea)
            { x: 5, y: 66, w: 6, anim: false },
            { x: 15, y: 70, w: 7, anim: false },
            { x: 25, y: 68, w: 5, anim: true },
            { x: 8, y: 78, w: 6, anim: false },
            { x: 20, y: 76, w: 5, anim: false },
            { x: 32, y: 74, w: 6, anim: false },
            { x: 3, y: 85, w: 7, anim: false },
            { x: 18, y: 84, w: 5, anim: false },
            { x: 28, y: 88, w: 6, anim: true },
            { x: 10, y: 92, w: 6, anim: false },
            { x: 35, y: 92, w: 5, anim: false },
            { x: 22, y: 96, w: 7, anim: false },
            { x: 42, y: 90, w: 5, anim: false },
          ].map((wave, i) => (
            <svg
              key={i}
              className={`absolute ${wave.anim ? (i % 2 === 0 ? 'animate-wave' : 'animate-wave-reverse') : ''}`}
              style={{
                left: `${wave.x}%`,
                top: `${wave.y}%`,
                width: `${wave.w}%`,
                height: '2%',
                opacity: 0.25 + (i % 4) * 0.05,
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
          ))}
        </div>

        {/* Ferries on fixed tracks */}
        {(() => {
          const nik = vessels.find((v) => v.isNikolaus);
          const others = vessels.filter((v) => !v.isNikolaus);

          // Compute extra spread for "others" when they overlap each other
          const othersWithProgress = others.map((v) => ({
            vessel: v,
            progress: getRoutePosition(v),
          })).sort((a, b) => a.progress - b.progress);

          const othersExtraOffset: number[] = new Array(othersWithProgress.length).fill(0);
          for (let i = 1; i < othersWithProgress.length; i++) {
            if (othersWithProgress[i].progress - othersWithProgress[i - 1].progress < OVERLAP_THRESHOLD) {
              othersExtraOffset[i] = othersExtraOffset[i - 1] + TRACK_OTHERS_SPREAD;
            }
          }

          return (
            <>
              {/* Nikolaus — center track */}
              {nik && (() => {
                const progress = getRoutePosition(nik);
                const pos = getPositionOnRoute(progress, TRACK_NIKOLAUS);
                return (
                  <div
                    key={nik.MMSI}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <div className="flex flex-col items-center">
                      <div style={{ transform: ferryTransform(nik.state) }}>
                        <FerryIcon name={nik.name} isNikolaus size={70} />
                      </div>
                      <div className="mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap bg-red-600 text-white">
                        {nik.name.replace('MV ', '')}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Other ferries — right track, spreading further right if overlapping */}
              {othersWithProgress.map(({ vessel, progress }, i) => {
                const offset = TRACK_OTHERS + othersExtraOffset[i];
                const pos = getPositionOnRoute(progress, offset);
                return (
                  <div
                    key={vessel.MMSI}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <div className="flex flex-col items-center">
                      <div style={{ transform: ferryTransform(vessel.state) }}>
                        <FerryIcon name={vessel.name} size={55} />
                      </div>
                      <div className="mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap bg-white bg-opacity-90 text-gray-800">
                        {vessel.name.replace('MV ', '')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 rounded-lg p-2 shadow-lg z-20">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <FerryIcon name="Nikolaus" isNikolaus size={32} />
              <span className="text-sm font-bold text-red-800">Nikolaus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FerryIcon name="MV Ta' Pinu" size={32} />
              <span className="text-sm text-gray-700">Ta' Pinu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FerryIcon name="MV Malita" size={32} />
              <span className="text-sm text-gray-700">Malita</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FerryIcon name="MV Gaudos" size={32} />
              <span className="text-sm text-gray-700">Gaudos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
