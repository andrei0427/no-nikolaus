import { Vessel, Terminal, VesselState, PortVehicleDetections } from '../types';
import { distanceToTerminal, estimateArrivalTime } from './coordinates';
import {
  TERMINALS,
  TURNAROUND_TIME,
  BUFFER_TIME,
  AVERAGE_CROSSING_TIME,
  FERRY_CAPACITIES,
  TRUCK_CAR_EQUIVALENT,
  MOTORBIKE_CAR_EQUIVALENT,
} from './constants';

export interface FerryPrediction {
  ferry: Vessel | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  /** Estimated departure time as "HH:MM", derived from vessel readiness */
  departureTime: string | null;
}

interface NikolausPositionPrediction {
  lat: number;
  lon: number;
  state: VesselState;
}

/** Convert minutes-of-day to "HH:MM" */
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Predict which ferry will likely serve the user upon arrival at a terminal.
 *
 * Pure position-based: computes when each vessel can be ready at the terminal,
 * then picks the first one the user will board (accounting for drive time and
 * optional queue drain).
 */
export function predictLikelyFerry(
  vessels: Vessel[],
  terminal: Terminal,
  driveTime: number | null,
  _schedule: unknown,
  queueData?: PortVehicleDetections | null
): FerryPrediction {
  if (vessels.length === 0) {
    return { ferry: null, confidence: 'low', reason: 'No ferry data available', departureTime: null };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // When user arrives at terminal (minutes of day)
  const userArrivalMinutes = driveTime !== null
    ? nowMinutes + driveTime + BUFFER_TIME
    : nowMinutes;

  // --- Vessel readiness ---
  const readyList: { vessel: Vessel; readyMinutes: number; detail: string }[] = [];

  for (const vessel of vessels) {
    const { state } = vessel;
    const isDocked =
      (terminal === 'cirkewwa' && state === 'DOCKED_CIRKEWWA') ||
      (terminal === 'mgarr' && state === 'DOCKED_MGARR');
    const isEnRoute =
      (terminal === 'cirkewwa' && state === 'EN_ROUTE_TO_CIRKEWWA') ||
      (terminal === 'mgarr' && state === 'EN_ROUTE_TO_MGARR');
    const isDockedOther =
      (terminal === 'cirkewwa' && state === 'DOCKED_MGARR') ||
      (terminal === 'mgarr' && state === 'DOCKED_CIRKEWWA');
    const isEnRouteAway =
      (terminal === 'cirkewwa' && state === 'EN_ROUTE_TO_MGARR') ||
      (terminal === 'mgarr' && state === 'EN_ROUTE_TO_CIRKEWWA');

    if (isDocked) {
      readyList.push({ vessel, readyMinutes: nowMinutes, detail: 'docked' });
    } else if (isEnRoute) {
      const dist = distanceToTerminal(vessel.LAT, vessel.LON, TERMINALS[terminal]);
      const eta = estimateArrivalTime(dist, vessel.SPEED);
      if (eta !== Infinity) {
        readyList.push({ vessel, readyMinutes: nowMinutes + eta + TURNAROUND_TIME, detail: `arrives in ~${Math.round(eta)} min` });
      }
    } else if (isDockedOther) {
      const readyMinutes = nowMinutes + TURNAROUND_TIME + AVERAGE_CROSSING_TIME + TURNAROUND_TIME;
      const from = terminal === 'cirkewwa' ? 'Gozo' : 'Malta';
      readyList.push({ vessel, readyMinutes, detail: `crossing from ${from}` });
    } else if (isEnRouteAway) {
      const otherTerminal = terminal === 'cirkewwa' ? 'mgarr' : 'cirkewwa';
      const dist = distanceToTerminal(vessel.LAT, vessel.LON, TERMINALS[otherTerminal]);
      const eta = estimateArrivalTime(dist, vessel.SPEED);
      if (eta !== Infinity) {
        const readyMinutes = nowMinutes + eta + TURNAROUND_TIME + AVERAGE_CROSSING_TIME + TURNAROUND_TIME;
        readyList.push({ vessel, readyMinutes, detail: `returning via ${otherTerminal === 'mgarr' ? 'Gozo' : 'Malta'}` });
      }
    }
  }

  readyList.sort((a, b) => a.readyMinutes - b.readyMinutes);

  if (readyList.length === 0) {
    return { ferry: null, confidence: 'low', reason: 'No ferry data available', departureTime: null };
  }

  // --- Queue drain ---
  if (queueData) {
    const totalQueue =
      queueData.car +
      queueData.truck * TRUCK_CAR_EQUIVALENT +
      queueData.motorbike * MOTORBIKE_CAR_EQUIVALENT;

    let remaining = totalQueue;

    for (const r of readyList) {
      const capacity = FERRY_CAPACITIES[r.vessel.name] ?? 100;
      remaining -= capacity;
      // Pick first vessel that departs after user arrives and clears the queue
      if (remaining <= 0 && r.readyMinutes >= userArrivalMinutes) {
        const confidence = r.detail === 'docked' ? 'high' : 'medium';
        const queueNote = totalQueue > capacity ? ' (queue clears)' : '';
        return {
          ferry: r.vessel,
          confidence,
          reason: `${r.vessel.name} — ${r.detail}${queueNote}`,
          departureTime: minutesToTime(r.readyMinutes),
        };
      }
      // Vessel departs before user arrives — still drains queue
      if (remaining <= 0) remaining = 0;
    }

    // Queue never drains
    const last = readyList[readyList.length - 1];
    return {
      ferry: last.vessel,
      confidence: 'low',
      reason: 'Heavy queue — expect delays',
      departureTime: minutesToTime(last.readyMinutes),
    };
  }

  // --- No queue data: first vessel ready when user arrives ---
  // Prefer a vessel already ready (docked) over one arriving later
  const readyOnArrival = readyList.find(r => r.readyMinutes <= userArrivalMinutes);
  if (readyOnArrival) {
    return {
      ferry: readyOnArrival.vessel,
      confidence: readyOnArrival.detail === 'docked' ? 'high' : 'medium',
      reason: readyOnArrival.detail === 'docked'
        ? `${readyOnArrival.vessel.name} — docked & waiting`
        : `${readyOnArrival.vessel.name} — ${readyOnArrival.detail}`,
      departureTime: null, // already waiting, no ETA needed
    };
  }

  // No vessel ready yet — pick the first one that will be
  const next = readyList[0];
  return {
    ferry: next.vessel,
    confidence: 'medium',
    reason: `${next.vessel.name} — ${next.detail}`,
    departureTime: minutesToTime(next.readyMinutes),
  };
}

/**
 * Predict where Nikolaus will be when the user arrives at a terminal
 */
export function predictNikolausPosition(
  nikolaus: Vessel | null,
  _terminal: Terminal,
  driveTime: number | null
): NikolausPositionPrediction | null {
  if (!nikolaus || driveTime === null) return null;

  const userArrivalTime = driveTime + BUFFER_TIME;
  const { state } = nikolaus;

  // Determine Nikolaus destination based on current state
  if (state === 'DOCKED_CIRKEWWA' || state === 'DOCKED_MGARR') {
    // If docked, check if it will still be there or have departed
    if (userArrivalTime < TURNAROUND_TIME) {
      // Still docked
      return { lat: nikolaus.LAT, lon: nikolaus.LON, state };
    } else {
      // Will have departed - predict at opposite terminal
      const destination = state === 'DOCKED_CIRKEWWA' ? 'mgarr' : 'cirkewwa';
      const destCoords = TERMINALS[destination];
      const newState = destination === 'mgarr' ? 'DOCKED_MGARR' : 'DOCKED_CIRKEWWA';

      if (userArrivalTime > TURNAROUND_TIME + AVERAGE_CROSSING_TIME) {
        return { lat: destCoords.lat, lon: destCoords.lon, state: newState };
      } else {
        // Still crossing - interpolate position
        const progress = (userArrivalTime - TURNAROUND_TIME) / AVERAGE_CROSSING_TIME;
        const startCoords = state === 'DOCKED_CIRKEWWA' ? TERMINALS.cirkewwa : TERMINALS.mgarr;
        const endCoords = TERMINALS[destination];

        return {
          lat: startCoords.lat + (endCoords.lat - startCoords.lat) * progress,
          lon: startCoords.lon + (endCoords.lon - startCoords.lon) * progress,
          state: destination === 'mgarr' ? 'EN_ROUTE_TO_MGARR' : 'EN_ROUTE_TO_CIRKEWWA',
        };
      }
    }
  }

  if (state === 'EN_ROUTE_TO_CIRKEWWA' || state === 'EN_ROUTE_TO_MGARR') {
    const destination = state === 'EN_ROUTE_TO_CIRKEWWA' ? 'cirkewwa' : 'mgarr';
    const destCoords = TERMINALS[destination];
    const distance = distanceToTerminal(nikolaus.LAT, nikolaus.LON, destCoords);
    const eta = estimateArrivalTime(distance, nikolaus.SPEED);

    if (eta === Infinity) return null;

    if (userArrivalTime < eta) {
      // Still en route when user arrives - interpolate
      const progress = userArrivalTime / eta;
      return {
        lat: nikolaus.LAT + (destCoords.lat - nikolaus.LAT) * progress,
        lon: nikolaus.LON + (destCoords.lon - nikolaus.LON) * progress,
        state,
      };
    } else if (userArrivalTime < eta + TURNAROUND_TIME) {
      // Docked at destination
      return {
        lat: destCoords.lat,
        lon: destCoords.lon,
        state: destination === 'cirkewwa' ? 'DOCKED_CIRKEWWA' : 'DOCKED_MGARR',
      };
    } else {
      // Has departed again - heading to other terminal
      const otherTerminal = destination === 'cirkewwa' ? 'mgarr' : 'cirkewwa';
      const otherCoords = TERMINALS[otherTerminal];
      const timeIntoReturn = userArrivalTime - eta - TURNAROUND_TIME;
      const progress = Math.min(timeIntoReturn / AVERAGE_CROSSING_TIME, 1);

      if (progress >= 1) {
        return {
          lat: otherCoords.lat,
          lon: otherCoords.lon,
          state: otherTerminal === 'cirkewwa' ? 'DOCKED_CIRKEWWA' : 'DOCKED_MGARR',
        };
      }

      return {
        lat: destCoords.lat + (otherCoords.lat - destCoords.lat) * progress,
        lon: destCoords.lon + (otherCoords.lon - destCoords.lon) * progress,
        state: otherTerminal === 'cirkewwa' ? 'EN_ROUTE_TO_CIRKEWWA' : 'EN_ROUTE_TO_MGARR',
      };
    }
  }

  return null;
}

