import { Vessel, Terminal, VesselState } from '../types';
import { distanceToTerminal, estimateArrivalTime } from './coordinates';
import { TERMINALS, TURNAROUND_TIME, BUFFER_TIME, AVERAGE_CROSSING_TIME } from './constants';

interface FerryPrediction {
  ferry: Vessel | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface NikolausPositionPrediction {
  lat: number;
  lon: number;
  state: VesselState;
}

/**
 * Predict which ferry will likely serve the user upon arrival at a terminal
 */
export function predictLikelyFerry(
  vessels: Vessel[],
  terminal: Terminal,
  driveTime: number | null
): FerryPrediction {
  if (vessels.length === 0) {
    return { ferry: null, confidence: 'low', reason: 'No ferry data available' };
  }

  const userArrivalTime = driveTime !== null ? driveTime + BUFFER_TIME : null;

  // Find ferries docked at the target terminal
  const dockedAtTerminal = vessels.filter((v) => {
    if (terminal === 'cirkewwa') return v.state === 'DOCKED_CIRKEWWA';
    return v.state === 'DOCKED_MGARR';
  });

  // Find ferries en route to the target terminal
  const enRouteToTerminal = vessels.filter((v) => {
    if (terminal === 'cirkewwa') return v.state === 'EN_ROUTE_TO_CIRKEWWA';
    return v.state === 'EN_ROUTE_TO_MGARR';
  });

  // If we don't have user arrival time, just report which ferries are there/coming
  if (userArrivalTime === null) {
    if (dockedAtTerminal.length > 0) {
      // Return the one that's been there longest (likely to depart first)
      // Without timestamp data, just return the first one
      return {
        ferry: dockedAtTerminal[0],
        confidence: 'medium',
        reason: `${dockedAtTerminal[0].name} is currently docked`,
      };
    }
    if (enRouteToTerminal.length > 0) {
      return {
        ferry: enRouteToTerminal[0],
        confidence: 'medium',
        reason: `${enRouteToTerminal[0].name} is en route`,
      };
    }
    return { ferry: null, confidence: 'low', reason: 'No ferries heading to this terminal' };
  }

  // With user arrival time, we can make better predictions
  // Check ferries en route - will they still be there when user arrives?
  for (const ferry of enRouteToTerminal) {
    const distance = distanceToTerminal(ferry.LAT, ferry.LON, TERMINALS[terminal]);
    const ferryEta = estimateArrivalTime(distance, ferry.SPEED);

    if (ferryEta !== Infinity) {
      const ferryDepartTime = ferryEta + TURNAROUND_TIME;

      // If user arrives before ferry departs
      if (userArrivalTime < ferryDepartTime) {
        return {
          ferry,
          confidence: 'high',
          reason: `${ferry.name} arrives in ~${Math.round(ferryEta)} min`,
        };
      }
    }
  }

  // Check ferries currently docked - will they still be there?
  for (const ferry of dockedAtTerminal) {
    // Assume docked ferries depart within TURNAROUND_TIME
    if (userArrivalTime < TURNAROUND_TIME) {
      return {
        ferry,
        confidence: 'high',
        reason: `${ferry.name} is docked and departing soon`,
      };
    }
  }

  // Check ferries at other terminal or en route away - they might come back
  const atOtherTerminal = vessels.filter((v) => {
    if (terminal === 'cirkewwa') return v.state === 'DOCKED_MGARR';
    return v.state === 'DOCKED_CIRKEWWA';
  });

  const enRouteAway = vessels.filter((v) => {
    if (terminal === 'cirkewwa') return v.state === 'EN_ROUTE_TO_MGARR';
    return v.state === 'EN_ROUTE_TO_CIRKEWWA';
  });

  // Estimate when these ferries might arrive at the target terminal
  for (const ferry of enRouteAway) {
    // Ferry is going away, will turn around and come back
    const distanceToOther = distanceToTerminal(
      ferry.LAT,
      ferry.LON,
      TERMINALS[terminal === 'cirkewwa' ? 'mgarr' : 'cirkewwa']
    );
    const timeToOther = estimateArrivalTime(distanceToOther, ferry.SPEED);

    if (timeToOther !== Infinity) {
      const roundTripTime = timeToOther + TURNAROUND_TIME + AVERAGE_CROSSING_TIME;

      if (userArrivalTime > roundTripTime && userArrivalTime < roundTripTime + TURNAROUND_TIME) {
        return {
          ferry,
          confidence: 'medium',
          reason: `${ferry.name} may return by then`,
        };
      }
    }
  }

  for (const ferry of atOtherTerminal) {
    // Ferry at other terminal, will cross to this terminal
    const timeToArrive = AVERAGE_CROSSING_TIME; // Approximate

    if (
      userArrivalTime > timeToArrive &&
      userArrivalTime < timeToArrive + TURNAROUND_TIME + 10
    ) {
      return {
        ferry,
        confidence: 'medium',
        reason: `${ferry.name} may arrive from ${terminal === 'cirkewwa' ? 'Gozo' : 'Malta'}`,
      };
    }
  }

  // Return any available ferry with low confidence
  if (vessels.length > 0) {
    return {
      ferry: vessels[0],
      confidence: 'low',
      reason: 'Timing uncertain',
    };
  }

  return { ferry: null, confidence: 'low', reason: 'Unable to predict' };
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
