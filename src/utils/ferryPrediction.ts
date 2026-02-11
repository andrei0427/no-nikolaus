import { Vessel, Terminal, VesselState, FerrySchedule } from '../types';
import { distanceToTerminal, estimateArrivalTime } from './coordinates';
import { TERMINALS, TURNAROUND_TIME, BUFFER_TIME, AVERAGE_CROSSING_TIME } from './constants';

export interface FerryPrediction {
  ferry: Vessel | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  departureTime: string | null;
}

interface NikolausPositionPrediction {
  lat: number;
  lon: number;
  state: VesselState;
}

/** Parse "HH:MM" to minutes-of-day */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Predict which ferry will likely serve the user upon arrival at a terminal.
 * Uses the schedule to determine the next catchable departure.
 */
export function predictLikelyFerry(
  vessels: Vessel[],
  terminal: Terminal,
  driveTime: number | null,
  schedule: FerrySchedule | null
): FerryPrediction {
  if (vessels.length === 0) {
    return { ferry: null, confidence: 'low', reason: 'No ferry data available', departureTime: null };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // When user arrives at terminal (minutes of day)
  const userArrivalMinutes = driveTime !== null
    ? nowMinutes + driveTime + BUFFER_TIME
    : null;

  // Scheduled departure times for this terminal (minutes of day)
  const depTimes = schedule
    ? (terminal === 'cirkewwa' ? schedule.cirkewwa : schedule.mgarr)?.map(t => ({ time: t, minutes: parseTime(t) })) ?? []
    : [];

  // For each vessel, estimate when it will be ready to depart from the target terminal
  const candidates: { vessel: Vessel; readyMinutes: number; detail: string }[] = [];

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
      // Already at terminal — can serve the very next departure
      candidates.push({ vessel, readyMinutes: nowMinutes, detail: 'docked' });
    } else if (isEnRoute) {
      const dist = distanceToTerminal(vessel.LAT, vessel.LON, TERMINALS[terminal]);
      const eta = estimateArrivalTime(dist, vessel.SPEED);
      if (eta !== Infinity) {
        // Ready after arriving + turnaround
        candidates.push({ vessel, readyMinutes: nowMinutes + eta + TURNAROUND_TIME, detail: `arrives in ~${Math.round(eta)} min` });
      }
    } else if (isDockedOther) {
      // Needs to depart other terminal, cross, then turnaround here
      const readyMinutes = nowMinutes + TURNAROUND_TIME + AVERAGE_CROSSING_TIME + TURNAROUND_TIME;
      const from = terminal === 'cirkewwa' ? 'Gozo' : 'Malta';
      candidates.push({ vessel, readyMinutes, detail: `crossing from ${from}` });
    } else if (isEnRouteAway) {
      const otherTerminal = terminal === 'cirkewwa' ? 'mgarr' : 'cirkewwa';
      const dist = distanceToTerminal(vessel.LAT, vessel.LON, TERMINALS[otherTerminal]);
      const eta = estimateArrivalTime(dist, vessel.SPEED);
      if (eta !== Infinity) {
        const readyMinutes = nowMinutes + eta + TURNAROUND_TIME + AVERAGE_CROSSING_TIME + TURNAROUND_TIME;
        candidates.push({ vessel, readyMinutes, detail: `returning via ${otherTerminal === 'mgarr' ? 'Gozo' : 'Malta'}` });
      }
    }
  }

  candidates.sort((a, b) => a.readyMinutes - b.readyMinutes);

  if (candidates.length === 0) {
    return { ferry: null, confidence: 'low', reason: 'No ferry data available', departureTime: null };
  }

  // --- Schedule-based prediction ---
  if (depTimes.length > 0) {
    const threshold = userArrivalMinutes ?? nowMinutes;

    // For each candidate (sorted by readiness), find the first scheduled departure
    // that is >= both the candidate's readiness and the user's arrival
    for (const c of candidates) {
      const minDep = Math.max(c.readyMinutes, threshold);
      const dep = depTimes.find(d => d.minutes >= minDep);
      if (dep) {
        const confidence = c.detail === 'docked' ? 'high' : 'medium';
        const reason = c.detail === 'docked'
          ? `${c.vessel.name} departs at ${dep.time}`
          : `${c.vessel.name} ${c.detail}, departs at ${dep.time}`;
        return { ferry: c.vessel, confidence, reason, departureTime: dep.time };
      }
    }

    return { ferry: null, confidence: 'low', reason: 'No more departures today', departureTime: null };
  }

  // --- Fallback without schedule ---
  const best = candidates[0];
  if (best.detail === 'docked') {
    return { ferry: best.vessel, confidence: 'medium', reason: `${best.vessel.name} is currently docked`, departureTime: null };
  }
  return { ferry: best.vessel, confidence: 'low', reason: `${best.vessel.name} ${best.detail}`, departureTime: null };
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

/**
 * Find the next scheduled departure from a terminal at or after a given time.
 * If `afterTime` is provided (e.g. from a prediction), returns the departure AFTER that one.
 * Returns the departure time string (e.g. "14:30") or null.
 */
export function getNextDeparture(
  terminal: Terminal,
  schedule: FerrySchedule | null,
  driveTimeMinutes: number | null,
  afterTime?: string | null
): string | null {
  if (!schedule) return null;

  const times = terminal === 'cirkewwa' ? schedule.cirkewwa : schedule.mgarr;
  if (!times || times.length === 0) return null;

  // Calculate the time the user arrives at the terminal
  const now = new Date();
  const arrivalMs = now.getTime() + (driveTimeMinutes ?? 0) * 60_000 + BUFFER_TIME * 60_000;
  const arrival = new Date(arrivalMs);
  const arrivalMinutes = arrival.getHours() * 60 + arrival.getMinutes();

  // If we have a predicted departure, find the one strictly after it
  const skipMinutes = afterTime ? parseTime(afterTime) : null;

  for (const time of times) {
    const depMinutes = parseTime(time);
    if (depMinutes >= arrivalMinutes) {
      // If skipping past a predicted departure, find the next one after it
      if (skipMinutes !== null && depMinutes <= skipMinutes) continue;
      return time;
    }
  }

  // No more departures today
  return null;
}
