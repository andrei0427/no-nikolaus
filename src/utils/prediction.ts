import { Vessel, Terminal, TerminalStatus } from '../types';
import { distanceToTerminal as calcDistanceToTerminal, estimateArrivalTime } from './coordinates';
import {
  TERMINALS,
  BUFFER_TIME,
  TURNAROUND_TIME,
} from './constants';

interface PredictionInput {
  nikolaus: Vessel | null;
  terminal: Terminal;
  driveTime: number | null;
}

export function predictTerminalStatus(input: PredictionInput): TerminalStatus {
  const { nikolaus, terminal, driveTime } = input;

  // If we can't find Nikolaus, assume it's safe (might be in maintenance)
  if (!nikolaus) {
    return {
      terminal,
      status: 'SAFE',
      reason: 'Nikolaus location unknown - likely not in service',
      nikolausState: 'UNKNOWN',
    };
  }

  const nikolausState = nikolaus.state;
  const userArrivalTime = driveTime !== null ? driveTime + BUFFER_TIME : null;

  // Terminal-specific states
  const isDockedAtThisTerminal =
    (terminal === 'cirkewwa' && nikolausState === 'DOCKED_CIRKEWWA') ||
    (terminal === 'mgarr' && nikolausState === 'DOCKED_MGARR');

  const isEnRouteToThisTerminal =
    (terminal === 'cirkewwa' && nikolausState === 'EN_ROUTE_TO_CIRKEWWA') ||
    (terminal === 'mgarr' && nikolausState === 'EN_ROUTE_TO_MGARR');

  const isAtOtherTerminal =
    (terminal === 'cirkewwa' && nikolausState === 'DOCKED_MGARR') ||
    (terminal === 'mgarr' && nikolausState === 'DOCKED_CIRKEWWA');

  const isEnRouteAway =
    (terminal === 'cirkewwa' && nikolausState === 'EN_ROUTE_TO_MGARR') ||
    (terminal === 'mgarr' && nikolausState === 'EN_ROUTE_TO_CIRKEWWA');

  // Case 1: Nikolaus is docked at this terminal
  if (isDockedAtThisTerminal) {
    // If we have drive time, check if user will arrive after Nikolaus departs
    if (userArrivalTime !== null) {
      if (userArrivalTime > TURNAROUND_TIME + 10) {
        // User arrives well after Nikolaus should have departed
        return {
          terminal,
          status: 'SAFE',
          reason: 'Nikolaus should depart before you arrive',
          nikolausState,
          driveTime: driveTime ?? undefined,
        };
      } else if (userArrivalTime > TURNAROUND_TIME) {
        // Timing is close
        return {
          terminal,
          status: 'CAUTION',
          reason: 'Nikolaus is docked here - timing uncertain',
          nikolausState,
          driveTime: driveTime ?? undefined,
        };
      }
    }

    // No drive time or user arrives during turnaround
    return {
      terminal,
      status: 'AVOID',
      reason: 'Nikolaus is currently docked here and likely next to depart',
      nikolausState,
      driveTime: driveTime ?? undefined,
    };
  }

  // Case 2: Nikolaus is en route to this terminal
  if (isEnRouteToThisTerminal) {
    const distance = calcDistanceToTerminal(
      nikolaus.LAT,
      nikolaus.LON,
      TERMINALS[terminal]
    );
    const eta = estimateArrivalTime(distance, nikolaus.SPEED);

    // If user can make it before Nikolaus arrives + turnaround, they might be safe
    if (userArrivalTime !== null && eta !== Infinity) {
      const nikolausReadyToDepart = eta + TURNAROUND_TIME;

      if (userArrivalTime < eta) {
        // User arrives before Nikolaus
        return {
          terminal,
          status: 'SAFE',
          reason: `You should arrive before Nikolaus (ETA: ${Math.round(eta)} min)`,
          nikolausState,
          nikolausEta: Math.round(eta),
          driveTime: driveTime ?? undefined,
        };
      } else if (userArrivalTime > nikolausReadyToDepart + 30) {
        // User arrives well after Nikolaus would have departed
        return {
          terminal,
          status: 'SAFE',
          reason: 'Nikolaus should depart before you arrive',
          nikolausState,
          nikolausEta: Math.round(eta),
          driveTime: driveTime ?? undefined,
        };
      } else {
        // Timing is uncertain
        return {
          terminal,
          status: 'CAUTION',
          reason: `Nikolaus arriving in ~${Math.round(eta)} min - timing uncertain`,
          nikolausState,
          nikolausEta: Math.round(eta),
          driveTime: driveTime ?? undefined,
        };
      }
    }

    // No drive time available, just warn about Nikolaus approaching
    return {
      terminal,
      status: 'CAUTION',
      reason: `Nikolaus en route here (ETA: ~${eta === Infinity ? '?' : Math.round(eta)} min)`,
      nikolausState,
      nikolausEta: eta === Infinity ? undefined : Math.round(eta),
      driveTime: driveTime ?? undefined,
    };
  }

  // Case 3: Nikolaus is at the other terminal
  if (isAtOtherTerminal) {
    return {
      terminal,
      status: 'SAFE',
      reason: `Nikolaus is docked at ${terminal === 'cirkewwa' ? 'Mġarr' : 'Ċirkewwa'}`,
      nikolausState,
      driveTime: driveTime ?? undefined,
    };
  }

  // Case 4: Nikolaus is heading away from this terminal
  if (isEnRouteAway) {
    return {
      terminal,
      status: 'SAFE',
      reason: `Nikolaus is heading to ${terminal === 'cirkewwa' ? 'Mġarr' : 'Ċirkewwa'}`,
      nikolausState,
      driveTime: driveTime ?? undefined,
    };
  }

  // Case 5: Unknown state
  return {
    terminal,
    status: 'CAUTION',
    reason: 'Nikolaus location uncertain',
    nikolausState,
    driveTime: driveTime ?? undefined,
  };
}

