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

export type NikolausStatus = 'ALL_CLEAR' | 'HEADS_UP' | 'DOCKED_HERE';

export interface TerminalCoordinates {
  lat: number;
  lon: number;
}

export interface TerminalStatus {
  terminal: Terminal;
  status: NikolausStatus;
  reason: string;
  nikolausState: VesselState;
  nikolausEta?: number; // minutes
  driveTime?: number; // minutes
  safeToCrossNow: boolean;
  safeMinutes: number | null; // minutes until safety status changes
  safetyMessage: string;
}

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

export interface DriveTimeResult {
  cirkewwa: number | null; // minutes
  mgarr: number | null; // minutes
  loading: boolean;
  error: string | null;
}

export interface PortVehicleDetections {
  car: number;
  motorbike: number;
  truck: number;
}

export interface PortVehicleData {
  cirkewwa: PortVehicleDetections | null;
  mgarr: PortVehicleDetections | null;
}

export interface FerrySchedule {
  date: string;
  cirkewwa: string[]; // departure times like ["06:45", "07:15", ...]
  mgarr: string[];
}
