import { Vessel, Terminal, TerminalStatus, FerrySchedule } from '../types';
import { distanceToTerminal as calcDistanceToTerminal, estimateArrivalTime } from './coordinates';
import {
  TERMINALS,
  BUFFER_TIME,
  TURNAROUND_TIME,
  AVERAGE_CROSSING_TIME,
} from './constants';

interface PredictionInput {
  nikolaus: Vessel | null;
  terminal: Terminal;
  driveTime: number | null;
  schedule?: FerrySchedule | null;
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Estimate how many minutes from now Nikolaus will depart this terminal.
 * Uses the schedule when available, falls back to TURNAROUND_TIME.
 */
function estimateDepartureMinutes(terminal: Terminal, schedule?: FerrySchedule | null): number {
  if (schedule) {
    const times = terminal === 'cirkewwa' ? schedule.cirkewwa : schedule.mgarr;
    if (times && times.length > 0) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nextDep = times.find(t => parseTime(t) >= nowMinutes);
      if (nextDep) {
        return parseTime(nextDep) - nowMinutes;
      }
    }
  }
  return TURNAROUND_TIME;
}

export function predictTerminalStatus(input: PredictionInput): TerminalStatus {
  const { nikolaus, terminal, driveTime, schedule } = input;

  // If we can't find Nikolaus, assume all clear (might be in maintenance)
  if (!nikolaus) {
    return {
      terminal,
      status: 'ALL_CLEAR',
      reason: 'Nikolaus location unknown — likely not in service',
      nikolausState: 'UNKNOWN',
      safeToCrossNow: true,
      safeMinutes: null,
      safetyMessage: 'Nikolaus is not in service',
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
    const departureMinutes = estimateDepartureMinutes(terminal, schedule);

    // If we have drive time, check if user will arrive after Nikolaus departs
    if (userArrivalTime !== null) {
      if (userArrivalTime > departureMinutes + 10) {
        // User arrives well after Nikolaus should have departed
        return {
          terminal,
          status: 'ALL_CLEAR',
          reason: 'Nikolaus should leave before you arrive',
          nikolausState,
          driveTime: driveTime ?? undefined,
          safeToCrossNow: true,
          safeMinutes: null,
          safetyMessage: 'Nikolaus should depart before you arrive',
        };
      } else if (userArrivalTime > departureMinutes) {
        // Timing is close
        return {
          terminal,
          status: 'HEADS_UP',
          reason: 'Nikolaus is docked here — timing uncertain',
          nikolausState,
          driveTime: driveTime ?? undefined,
          safeToCrossNow: false,
          safeMinutes: Math.max(0, departureMinutes),
          safetyMessage: `Nikolaus should leave in ~${Math.round(departureMinutes)} min`,
        };
      }
    }

    // No drive time or user arrives during turnaround
    return {
      terminal,
      status: 'DOCKED_HERE',
      reason: 'Nikolaus is docked here — likely next to depart',
      nikolausState,
      driveTime: driveTime ?? undefined,
      safeToCrossNow: false,
      safeMinutes: departureMinutes,
      safetyMessage: `Nikolaus is here now. Should leave in ~${Math.round(departureMinutes)} min`,
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
        // User arrives before Nikolaus — safe, with a window
        const safeWindow = Math.round(eta - (driveTime ?? 0));
        return {
          terminal,
          status: 'ALL_CLEAR',
          reason: `You should arrive before Nikolaus (ETA: ${Math.round(eta)} min)`,
          nikolausState,
          nikolausEta: Math.round(eta),
          driveTime: driveTime ?? undefined,
          safeToCrossNow: true,
          safeMinutes: Math.max(0, safeWindow),
          safetyMessage: `Leave within ${safeWindow} min to arrive before Nikolaus`,
        };
      } else if (userArrivalTime > nikolausReadyToDepart + 30) {
        // User arrives well after Nikolaus would have departed
        return {
          terminal,
          status: 'ALL_CLEAR',
          reason: 'Nikolaus should leave before you arrive',
          nikolausState,
          nikolausEta: Math.round(eta),
          driveTime: driveTime ?? undefined,
          safeToCrossNow: true,
          safeMinutes: null,
          safetyMessage: 'Nikolaus should depart before you arrive',
        };
      } else {
        // Timing is uncertain
        return {
          terminal,
          status: 'HEADS_UP',
          reason: `Nikolaus arriving in ~${Math.round(eta)} min — timing uncertain`,
          nikolausState,
          nikolausEta: Math.round(eta),
          driveTime: driveTime ?? undefined,
          safeToCrossNow: false,
          safeMinutes: Math.round(nikolausReadyToDepart),
          safetyMessage: `Nikolaus arrives in ~${Math.round(eta)} min, may delay you`,
        };
      }
    }

    // No drive time available, just note Nikolaus approaching
    return {
      terminal,
      status: 'HEADS_UP',
      reason: `Nikolaus en route here (ETA: ~${eta === Infinity ? '?' : Math.round(eta)} min)`,
      nikolausState,
      nikolausEta: eta === Infinity ? undefined : Math.round(eta),
      driveTime: driveTime ?? undefined,
      safeToCrossNow: false,
      safeMinutes: eta === Infinity ? null : Math.round(eta + TURNAROUND_TIME),
      safetyMessage: eta === Infinity
        ? 'Nikolaus is heading here — timing unknown'
        : `Nikolaus arrives in ~${Math.round(eta)} min`,
    };
  }

  // Case 3: Nikolaus is at the other terminal
  if (isAtOtherTerminal) {
    // Safe for at least turnaround + crossing time
    const safeFor = TURNAROUND_TIME + AVERAGE_CROSSING_TIME;
    return {
      terminal,
      status: 'ALL_CLEAR',
      reason: `Nikolaus is docked at ${terminal === 'cirkewwa' ? 'Mgarr' : 'Cirkewwa'}`,
      nikolausState,
      driveTime: driveTime ?? undefined,
      safeToCrossNow: true,
      safeMinutes: safeFor,
      safetyMessage: `All clear for ~${safeFor} min`,
    };
  }

  // Case 4: Nikolaus is heading away from this terminal
  if (isEnRouteAway) {
    // Safe for at least crossing + turnaround + crossing
    const safeFor = AVERAGE_CROSSING_TIME + TURNAROUND_TIME + AVERAGE_CROSSING_TIME;
    return {
      terminal,
      status: 'ALL_CLEAR',
      reason: `Nikolaus is heading to ${terminal === 'cirkewwa' ? 'Mgarr' : 'Cirkewwa'}`,
      nikolausState,
      driveTime: driveTime ?? undefined,
      safeToCrossNow: true,
      safeMinutes: safeFor,
      safetyMessage: `All clear for ~${safeFor} min`,
    };
  }

  // Case 5: Unknown state
  return {
    terminal,
    status: 'HEADS_UP',
    reason: 'Nikolaus location uncertain',
    nikolausState,
    driveTime: driveTime ?? undefined,
    safeToCrossNow: false,
    safeMinutes: null,
    safetyMessage: 'Nikolaus location uncertain — be cautious',
  };
}
