import { TerminalCoordinates } from './types.js';

export const VESSEL_NAMES: Record<number, string> = {
  248692000: "MV Ta' Pinu",
  237593100: 'MV Nikolaos',
  215145000: 'MV Malita',
  248928000: 'MV Gaudos',
};

export const NIKOLAUS_MMSI = 237593100;

export const TERMINALS: Record<string, TerminalCoordinates> = {
  cirkewwa: { lat: 35.989, lon: 14.329 },
  mgarr: { lat: 36.025, lon: 14.299 },
};

// Distance threshold for considering vessel "docked" (in km)
export const DOCKED_THRESHOLD_KM = 0.5;

// Speed threshold for considering vessel "moving" (in tenths of knots, so 10 = 1 knot)
export const MOVING_SPEED_THRESHOLD = 10;

// Heading ranges for determining direction
export const HEADING_TO_CIRKEWWA_MIN = 90;
export const HEADING_TO_CIRKEWWA_MAX = 180;
