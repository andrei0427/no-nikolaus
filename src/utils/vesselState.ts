import { VesselData, VesselState } from '../types';
import { distanceToTerminal } from './coordinates';
import {
  TERMINALS,
  DOCKED_THRESHOLD_KM,
  MOVING_SPEED_THRESHOLD,
  HEADING_TO_CIRKEWWA_MIN,
  HEADING_TO_CIRKEWWA_MAX,
} from './constants';

export function determineVesselState(vessel: VesselData): VesselState {
  const distToCirkewwa = distanceToTerminal(
    vessel.LAT,
    vessel.LON,
    TERMINALS.cirkewwa
  );
  const distToMgarr = distanceToTerminal(
    vessel.LAT,
    vessel.LON,
    TERMINALS.mgarr
  );

  const isMoving = vessel.SPEED >= MOVING_SPEED_THRESHOLD;
  const nearCirkewwa = distToCirkewwa < DOCKED_THRESHOLD_KM;
  const nearMgarr = distToMgarr < DOCKED_THRESHOLD_KM;

  // If not moving and near a terminal, vessel is docked
  if (!isMoving && nearCirkewwa) {
    return 'DOCKED_CIRKEWWA';
  }
  if (!isMoving && nearMgarr) {
    return 'DOCKED_MGARR';
  }

  // If moving, determine direction based on heading/course
  if (isMoving) {
    // Use COURSE if available and valid, otherwise HEADING
    const direction = vessel.COURSE > 0 ? vessel.COURSE : vessel.HEADING;

    // Normalize direction to 0-360
    const normalizedDirection = ((direction % 360) + 360) % 360;

    // SE direction (roughly 90-180) heads toward Cirkewwa
    // NW direction (roughly 270-360 or 315-45) heads toward Mgarr
    const headingToCirkewwa =
      normalizedDirection >= HEADING_TO_CIRKEWWA_MIN &&
      normalizedDirection <= HEADING_TO_CIRKEWWA_MAX;

    if (headingToCirkewwa) {
      return 'EN_ROUTE_TO_CIRKEWWA';
    } else {
      return 'EN_ROUTE_TO_MGARR';
    }
  }

  // If not near either terminal and not moving, status is unknown
  // (possibly in maintenance at Grand Harbour or other location)
  return 'UNKNOWN';
}

export function isNearTerminal(
  lat: number,
  lon: number,
  terminal: 'cirkewwa' | 'mgarr'
): boolean {
  const dist = distanceToTerminal(lat, lon, TERMINALS[terminal]);
  return dist < DOCKED_THRESHOLD_KM;
}
