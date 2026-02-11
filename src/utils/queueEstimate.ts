import { PortVehicleDetections } from '../types';
import {
  FERRY_CAPACITIES,
  TRUCK_CAR_EQUIVALENT,
  MOTORBIKE_CAR_EQUIVALENT,
} from './constants';

export interface QueueEstimate {
  carEquivalent: number;
  ferryCapacity: number | null;
  loadsNeeded: number | null;
  severity: 'low' | 'moderate' | 'high';
  message: string;
}

export function estimateQueue(
  queueData: PortVehicleDetections,
  ferryName: string | null
): QueueEstimate {
  const carEquivalent = Math.round(
    queueData.car +
      queueData.truck * TRUCK_CAR_EQUIVALENT +
      queueData.motorbike * MOTORBIKE_CAR_EQUIVALENT
  );

  const ferryCapacity = ferryName ? (FERRY_CAPACITIES[ferryName] ?? null) : null;

  let loadsNeeded: number | null = null;
  let severity: QueueEstimate['severity'] = 'low';
  let message: string;

  if (ferryCapacity) {
    loadsNeeded = Math.ceil(carEquivalent / ferryCapacity);

    if (loadsNeeded <= 1 && carEquivalent <= ferryCapacity * 0.7) {
      severity = 'low';
      message = 'Queue fits comfortably on next ferry';
    } else if (loadsNeeded <= 1) {
      severity = 'moderate';
      message = 'Queue is filling up — arrive early to secure a spot';
    } else {
      severity = 'high';
      message = `Queue exceeds capacity — ~${loadsNeeded} trips needed to clear`;
    }
  } else {
    // No ferry prediction, estimate severity from raw count
    if (carEquivalent <= 50) {
      severity = 'low';
      message = 'Light queue';
    } else if (carEquivalent <= 100) {
      severity = 'moderate';
      message = 'Moderate queue — expect some wait';
    } else {
      severity = 'high';
      message = 'Heavy queue — expect significant delays';
    }
  }

  return { carEquivalent, ferryCapacity, loadsNeeded, severity, message };
}
