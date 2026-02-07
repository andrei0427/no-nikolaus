import { TerminalCoordinates } from '../types';

export const VESSEL_NAMES: Record<number, string> = {
  248692000: 'MV Ta\' Pinu',
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
// SE direction (towards Cirkewwa): roughly 90-180 degrees
// NW direction (towards Mgarr): roughly 270-360 or 0-90 degrees
export const HEADING_TO_CIRKEWWA_MIN = 90;
export const HEADING_TO_CIRKEWWA_MAX = 180;

// Average crossing time in minutes
export const AVERAGE_CROSSING_TIME = 25;

// Buffer time for parking/boarding in minutes
export const BUFFER_TIME = 15;

// Turnaround time at terminal in minutes
export const TURNAROUND_TIME = 15;
