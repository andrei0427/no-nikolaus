import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { Vessel, VesselData } from '../types';
import { VESSEL_NAMES, NIKOLAUS_MMSI } from '../utils/constants';
import { determineVesselState } from '../utils/vesselState';

const firebaseConfig = {
  apiKey: "AIzaSyB1Qc0mjt5omlG7AHznY_RAHVgyq-It-tI",
  authDomain: "gozo-channel-manager.firebaseapp.com",
  databaseURL: "https://gozo-channel-manager.firebaseio.com",
  projectId: "gozo-channel-manager",
  storageBucket: "gozo-channel-manager.appspot.com",
  messagingSenderId: "465225105425",
  appId: "1:465225105425:web:dc62dcf195f85885",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

interface UseVesselTrackingResult {
  vessels: Vessel[];
  nikolaus: Vessel | null;
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export function useVesselTracking(): UseVesselTrackingResult {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ferryPositionsRef = ref(database, 'Manager/FerryPositions');

    const unsubscribe = onValue(
      ferryPositionsRef,
      (snapshot) => {
        setConnected(true);
        setError(null);

        if (snapshot.exists()) {
          const vesselList: Vessel[] = [];

          snapshot.forEach((childSnapshot) => {
            const mmsi = parseInt(childSnapshot.key || '0', 10);
            const vesselData = childSnapshot.val() as VesselData;
            const name = VESSEL_NAMES[mmsi];

            if (name && vesselData.LAT && vesselData.LON) {
              const state = determineVesselState(vesselData);
              vesselList.push({
                ...vesselData,
                MMSI: mmsi,
                name,
                isNikolaus: mmsi === NIKOLAUS_MMSI,
                state,
              });
            }
          });

          setVessels(vesselList);
          setLastUpdate(new Date());
        }
      },
      (err) => {
        setError(err.message);
        setConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const nikolaus = vessels.find((v) => v.isNikolaus) || null;

  return {
    vessels,
    nikolaus,
    connected,
    lastUpdate,
    error,
  };
}
