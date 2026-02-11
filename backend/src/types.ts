export interface VesselData {
  MMSI: number;
  LAT: number;
  LON: number;
  SPEED: number; // in tenths of knots
  HEADING: number;
  COURSE: number;
  TIMESTAMP: number;
  STATUS: number;
}

export interface Vessel extends VesselData {
  name: string;
  isNikolaus: boolean;
  state: VesselState;
}

export type VesselState =
  | 'DOCKED_CIRKEWWA'
  | 'DOCKED_MGARR'
  | 'EN_ROUTE_TO_MGARR'
  | 'EN_ROUTE_TO_CIRKEWWA'
  | 'UNKNOWN';

export type Terminal = 'cirkewwa' | 'mgarr';

export interface TerminalCoordinates {
  lat: number;
  lon: number;
}

export interface SSEMessage {
  vessels: Vessel[];
  timestamp: number;
}
