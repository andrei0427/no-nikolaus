import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vessel, Terminal } from '../types';
import { TERMINALS } from '../utils/constants';
import { predictNikolausPosition } from '../utils/ferryPrediction';

interface MapViewProps {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  userLocation: { lat: number; lon: number } | null;
  driveTime: { cirkewwa: number | null; mgarr: number | null };
  selectedTerminal?: Terminal;
}

// Custom icons
const createFerryIcon = (isNikolaus: boolean, isGhost: boolean = false) => {
  const color = isNikolaus ? '#ef4444' : '#3b82f6'; // red for Nikolaus, blue for others
  const opacity = isGhost ? 0.5 : 1;

  return L.divIcon({
    className: 'custom-ferry-icon',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: ${opacity};
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.9-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const terminalIcon = L.divIcon({
  className: 'custom-terminal-icon',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #1e293b;
      border: 2px solid white;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background: #22c55e;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to handle map bounds
function MapBounds({ vessels, userLocation }: { vessels: Vessel[]; userLocation: { lat: number; lon: number } | null }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      [TERMINALS.cirkewwa.lat, TERMINALS.cirkewwa.lon],
      [TERMINALS.mgarr.lat, TERMINALS.mgarr.lon],
    ];

    vessels.forEach((v) => {
      points.push([v.LAT, v.LON]);
    });

    if (userLocation) {
      points.push([userLocation.lat, userLocation.lon]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }
  }, [map, vessels, userLocation]);

  return null;
}

export function MapView({ vessels, nikolaus, userLocation, driveTime, selectedTerminal }: MapViewProps) {
  // Predict Nikolaus position when user arrives
  const nikolausPrediction = nikolaus && selectedTerminal
    ? predictNikolausPosition(
        nikolaus,
        selectedTerminal,
        selectedTerminal === 'cirkewwa' ? driveTime.cirkewwa : driveTime.mgarr
      )
    : null;

  // Center on Malta-Gozo channel
  const center: [number, number] = [36.007, 14.314];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Live Ferry Positions</h3>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            Nikolaus
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
            Other ferries
          </div>
          {userLocation && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
              You
            </div>
          )}
          {nikolausPrediction && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500 opacity-50 inline-block"></span>
              Nikolaus (predicted)
            </div>
          )}
        </div>
      </div>
      <div style={{ height: '250px', width: '100%' }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds vessels={vessels} userLocation={userLocation} />

          {/* Terminal markers */}
          <Marker position={[TERMINALS.cirkewwa.lat, TERMINALS.cirkewwa.lon]} icon={terminalIcon}>
            <Popup>
              <strong>Cirkewwa</strong>
              <br />
              Malta terminal
            </Popup>
          </Marker>
          <Marker position={[TERMINALS.mgarr.lat, TERMINALS.mgarr.lon]} icon={terminalIcon}>
            <Popup>
              <strong>Mgarr</strong>
              <br />
              Gozo terminal
            </Popup>
          </Marker>

          {/* Vessel markers */}
          {vessels.map((vessel) => (
            <Marker
              key={vessel.MMSI}
              position={[vessel.LAT, vessel.LON]}
              icon={createFerryIcon(vessel.isNikolaus)}
            >
              <Popup>
                <strong>{vessel.name}</strong>
                <br />
                {vessel.state.replace(/_/g, ' ')}
                <br />
                Speed: {(vessel.SPEED / 10).toFixed(1)} knots
              </Popup>
            </Marker>
          ))}

          {/* Predicted Nikolaus position */}
          {nikolausPrediction && (
            <>
              <Marker
                position={[nikolausPrediction.lat, nikolausPrediction.lon]}
                icon={createFerryIcon(true, true)}
              >
                <Popup>
                  <strong>Nikolaus (predicted)</strong>
                  <br />
                  When you arrive at {selectedTerminal}
                  <br />
                  {nikolausPrediction.state.replace(/_/g, ' ')}
                </Popup>
              </Marker>
              <Circle
                center={[nikolausPrediction.lat, nikolausPrediction.lon]}
                radius={500}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.1,
                  weight: 1,
                  dashArray: '5, 5',
                }}
              />
            </>
          )}

          {/* User location */}
          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
                <Popup>
                  <strong>Your location</strong>
                </Popup>
              </Marker>
              <Circle
                center={[userLocation.lat, userLocation.lon]}
                radius={200}
                pathOptions={{
                  color: '#22c55e',
                  fillColor: '#22c55e',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
