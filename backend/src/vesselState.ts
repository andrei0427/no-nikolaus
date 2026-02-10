import { VesselData, VesselState, TerminalCoordinates } from './types.js';
import {
  TERMINALS,
  DOCKED_THRESHOLD_KM,
  MOVING_SPEED_THRESHOLD,
  HEADING_TO_CIRKEWWA_MIN,
  HEADING_TO_CIRKEWWA_MAX,
} from './constants.js';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function distanceToTerminal(
  vesselLat: number,
  vesselLon: number,
  terminal: TerminalCoordinates
): number {
  return haversineDistance(vesselLat, vesselLon, terminal.lat, terminal.lon);
}

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
  return 'UNKNOWN';
}
