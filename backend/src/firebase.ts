import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, DataSnapshot } from 'firebase/database';
import { Vessel, VesselData, PortVehicleData, PortVehicleDetections } from './types.js';
import { VESSEL_NAMES, NIKOLAUS_MMSI } from './constants.js';
import { determineVesselState } from './vesselState.js';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyB1Qc0mjt5omlG7AHznY_RAHVgyq-It-tI',
  authDomain: 'gozo-channel-manager.firebaseapp.com',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://gozo-channel-manager.firebaseio.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'gozo-channel-manager',
  storageBucket: 'gozo-channel-manager.appspot.com',
  messagingSenderId: '465225105425',
  appId: '1:465225105425:web:dc62dcf195f85885',
};

let latestVessels: Vessel[] = [];
let latestPortVehicleData: PortVehicleData = { cirkewwa: null, mgarr: null };
const listeners: Set<(vessels: Vessel[]) => void> = new Set();
const portVehicleListeners: Set<(data: PortVehicleData) => void> = new Set();

function processVessels(snapshot: DataSnapshot): Vessel[] {
  const vessels: Vessel[] = [];

  snapshot.forEach((childSnapshot) => {
    const mmsi = parseInt(childSnapshot.key || '0', 10);
    const vesselData = childSnapshot.val() as VesselData;
    const name = VESSEL_NAMES[mmsi];

    if (name && vesselData.LAT && vesselData.LON) {
      const state = determineVesselState(vesselData);
      vessels.push({
        ...vesselData,
        MMSI: mmsi,
        name,
        isNikolaus: mmsi === NIKOLAUS_MMSI,
        state,
      });
    }
  });

  return vessels;
}

export function initFirebase(): void {
  console.log('Initializing Firebase connection...');
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  const ferryPositionsRef = ref(database, 'Manager/FerryPositions');

  onValue(
    ferryPositionsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        latestVessels = processVessels(snapshot);
        console.log(`Received update: ${latestVessels.length} vessels`);

        // Notify all SSE listeners
        listeners.forEach((callback) => callback(latestVessels));
      }
    },
    (error) => {
      console.error('Firebase error:', error.message);
    }
  );

  // Listen for port vehicle queue data
  const portVehicleRef = ref(database, 'Manager/PortVehicleData');

  onValue(
    portVehicleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const settings = raw?.settings;
        const showCirkewwa = settings?.show_cirkewwa_vehicle_data === 1;
        const showMgarr = settings?.show_imgarr_vehicle_data === 1;

        let cirkewwa: PortVehicleDetections | null = null;
        let mgarr: PortVehicleDetections | null = null;

        for (const [key, value] of Object.entries(raw)) {
          if (key === 'settings') continue;
          const entry = value as { name?: string; detections?: PortVehicleDetections };
          if (entry.name === 'Cirkewwa' && showCirkewwa && entry.detections) {
            cirkewwa = entry.detections;
          } else if (entry.name === 'Mgarr' && showMgarr && entry.detections) {
            mgarr = entry.detections;
          }
        }

        latestPortVehicleData = { cirkewwa, mgarr };
        console.log(`Port vehicle update: Cirkewwa=${cirkewwa ? 'yes' : 'hidden'}, Mgarr=${mgarr ? 'yes' : 'hidden'}`);
        portVehicleListeners.forEach((cb) => cb(latestPortVehicleData));
      }
    },
    (error) => {
      console.error('Firebase port vehicle error:', error.message);
    }
  );

  console.log('Firebase listeners attached');
}

export function subscribe(callback: (vessels: Vessel[]) => void): () => void {
  listeners.add(callback);

  // Send current state immediately if we have data
  if (latestVessels.length > 0) {
    callback(latestVessels);
  }

  return () => {
    listeners.delete(callback);
  };
}

export function getLatestVessels(): Vessel[] {
  return latestVessels;
}

export function subscribePortVehicles(callback: (data: PortVehicleData) => void): () => void {
  portVehicleListeners.add(callback);

  if (latestPortVehicleData.cirkewwa || latestPortVehicleData.mgarr) {
    callback(latestPortVehicleData);
  }

  return () => {
    portVehicleListeners.delete(callback);
  };
}

export function getLatestPortVehicleData(): PortVehicleData {
  return latestPortVehicleData;
}
