import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { predictLikelyFerry } from './ferryPrediction';
import type { Vessel, PortVehicleDetections } from '../types';

function makeVessel(overrides: Partial<Vessel> = {}): Vessel {
  return {
    MMSI: 215145000,
    LAT: 35.989,
    LON: 14.329,
    SPEED: 0,
    HEADING: 0,
    COURSE: 0,
    TIMESTAMP: Date.now(),
    STATUS: 0,
    name: 'MV Malita',
    isNikolaus: false,
    state: 'DOCKED_CIRKEWWA',
    ...overrides,
  };
}

describe('predictLikelyFerry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T13:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns low confidence with no vessels', () => {
    const result = predictLikelyFerry([], 'cirkewwa', 10, null);
    expect(result.ferry).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence for docked vessel at terminal', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, null);
    expect(result.ferry).toBeTruthy();
    expect(result.ferry!.name).toBe('MV Malita');
    expect(result.confidence).toBe('high');
    // Docked vessel is already waiting — no departure time needed
    expect(result.departureTime).toBeNull();
  });

  it('returns medium confidence for en-route vessel', () => {
    const vessel = makeVessel({
      state: 'EN_ROUTE_TO_CIRKEWWA',
      LAT: 36.01,
      LON: 14.31,
      SPEED: 100, // 10 knots
    });
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, null);
    expect(result.confidence).toBe('medium');
    // Close vessel arrives before user — will be ready and waiting
    expect(result.departureTime).toBeNull();
  });

  it('works without drive time', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const result = predictLikelyFerry([vessel], 'cirkewwa', null, null);
    expect(result.ferry).toBeTruthy();
    expect(result.confidence).toBe('high');
  });

  it('handles mgarr terminal', () => {
    const vessel = makeVessel({
      state: 'DOCKED_MGARR',
      LAT: 36.025,
      LON: 14.299,
    });
    const result = predictLikelyFerry([vessel], 'mgarr', 10, null);
    expect(result.ferry!.name).toBe('MV Malita');
  });

  it('prefers docked vessel over en-route vessel when both available on arrival', () => {
    const docked = makeVessel({
      MMSI: 215145000,
      name: 'MV Malita',
      state: 'DOCKED_CIRKEWWA',
    });
    const enRoute = makeVessel({
      MMSI: 237593100,
      name: 'MV Nikolaos',
      isNikolaus: true,
      state: 'EN_ROUTE_TO_CIRKEWWA',
      LAT: 36.01,
      LON: 14.31,
      SPEED: 100,
    });
    const result = predictLikelyFerry([docked, enRoute], 'cirkewwa', 10, null);
    expect(result.ferry!.name).toBe('MV Malita');
  });

  // --- Queue-aware tests ---

  it('queue fits on one ferry — predicts first docked ferry', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const queueData: PortVehicleDetections = { car: 50, truck: 0, motorbike: 0 };
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, null, queueData);
    expect(result.ferry!.name).toBe('MV Malita');
  });

  it('queue needs 2 loads — skips first ferry, predicts second', () => {
    // MV Malita capacity = 138, queue = 200 cars → needs 2 ferries
    const malita = makeVessel({
      MMSI: 215145000,
      name: 'MV Malita',
      state: 'DOCKED_CIRKEWWA',
    });
    const nikolaus = makeVessel({
      MMSI: 237593100,
      name: 'MV Nikolaos',
      isNikolaus: true,
      state: 'DOCKED_CIRKEWWA',
    });
    const queueData: PortVehicleDetections = { car: 200, truck: 0, motorbike: 0 };
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 10, null, queueData);
    // First ferry (Malita, 138 cap) drains 138, remaining = 62
    // Second ferry (Nikolaus, 160 cap) drains 160, remaining = -98 → user's ferry
    expect(result.ferry!.name).toBe('MV Nikolaos');
  });

  it('heavy queue shows low confidence', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    // Single ferry, capacity 138, queue = 350 → can never drain
    const queueData: PortVehicleDetections = { car: 350, truck: 0, motorbike: 0 };
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, null, queueData);
    expect(result.confidence).toBe('low');
    expect(result.reason).toContain('Heavy queue');
  });

  it('queue with trucks uses car-equivalent conversion', () => {
    // 100 cars + 20 trucks (20 * 3 = 60 car-equiv) = 160 total
    // MV Malita capacity = 138, so needs 2nd ferry
    const malita = makeVessel({
      MMSI: 215145000,
      name: 'MV Malita',
      state: 'DOCKED_CIRKEWWA',
    });
    const nikolaus = makeVessel({
      MMSI: 237593100,
      name: 'MV Nikolaos',
      isNikolaus: true,
      state: 'DOCKED_CIRKEWWA',
    });
    const queueData: PortVehicleDetections = { car: 100, truck: 20, motorbike: 0 };
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 10, null, queueData);
    expect(result.ferry!.name).toBe('MV Nikolaos');
  });
});
