import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { predictLikelyFerry, getNextDeparture } from './ferryPrediction';
import type { Vessel, FerrySchedule, PortVehicleDetections } from '../types';

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

const schedule: FerrySchedule = {
  date: '2026-02-10',
  cirkewwa: ['06:00', '07:00', '08:00', '14:00', '15:00', '20:00'],
  mgarr: ['06:30', '07:30', '08:30', '14:30', '15:30', '20:30'],
};

describe('predictLikelyFerry', () => {
  beforeEach(() => {
    // Fix time to 13:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T13:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns low confidence with no vessels', () => {
    const result = predictLikelyFerry([], 'cirkewwa', 10, schedule);
    expect(result.ferry).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence for docked vessel with schedule', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, schedule);
    expect(result.ferry).toBeTruthy();
    expect(result.ferry!.name).toBe('MV Malita');
    expect(result.confidence).toBe('high');
    expect(result.departureTime).toBe('14:00');
  });

  it('returns medium confidence for en-route vessel', () => {
    const vessel = makeVessel({
      state: 'EN_ROUTE_TO_CIRKEWWA',
      LAT: 36.01,
      LON: 14.31,
      SPEED: 100, // 10 knots
    });
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, schedule);
    expect(result.confidence).toBe('medium');
  });

  it('returns null departure when no more departures today', () => {
    vi.setSystemTime(new Date('2026-02-10T21:00:00'));
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, schedule);
    expect(result.departureTime).toBeNull();
  });

  it('works without schedule (fallback)', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, null);
    expect(result.ferry).toBeTruthy();
    expect(result.confidence).toBe('medium');
    expect(result.departureTime).toBeNull();
  });

  it('handles mgarr terminal', () => {
    const vessel = makeVessel({
      state: 'DOCKED_MGARR',
      LAT: 36.025,
      LON: 14.299,
    });
    const result = predictLikelyFerry([vessel], 'mgarr', 10, schedule);
    expect(result.ferry!.name).toBe('MV Malita');
    expect(result.departureTime).toBe('14:30');
  });

  it('does not predict docked vessel that departs before user arrives', () => {
    // Time: 13:50, departure at 14:00 (in 10 min), user driveTime 30 → arrives 14:35
    // Vessel departs at 14:00 before user arrives — should not show as "docked"
    vi.setSystemTime(new Date('2026-02-10T13:50:00'));
    const nikolaus = makeVessel({
      MMSI: 237593100,
      name: 'MV Nikolaos',
      isNikolaus: true,
      state: 'DOCKED_CIRKEWWA',
    });
    const other = makeVessel({
      MMSI: 248692000,
      name: "MV Ta' Pinu",
      state: 'DOCKED_MGARR', // docked at other terminal
      LAT: 36.025,
      LON: 14.299,
    });
    const result = predictLikelyFerry([nikolaus, other], 'cirkewwa', 30, schedule);
    // Nikolaus departs at 14:00, round trip ~80 min, back ~15:20
    // Ta' Pinu at other terminal, crossing over ~55 min, ready ~14:45
    // User arrives 14:35, so Ta' Pinu should be the prediction, not Nikolaus
    expect(result.ferry).toBeTruthy();
    expect(result.ferry!.name).not.toBe('MV Nikolaos');
  });

  // --- Queue-aware tests ---

  it('queue fits on one ferry — predicts first docked ferry', () => {
    const vessel = makeVessel({ state: 'DOCKED_CIRKEWWA' });
    const queueData: PortVehicleDetections = { car: 50, truck: 0, motorbike: 0 };
    const result = predictLikelyFerry([vessel], 'cirkewwa', 10, schedule, queueData);
    expect(result.ferry!.name).toBe('MV Malita');
    expect(result.departureTime).toBe('14:00');
    expect(result.confidence).toBe('high');
  });

  it('queue needs 2 loads — skips first ferry, predicts second', () => {
    // MV Malita capacity = 138, queue = 200 cars → needs 2 ferries
    // Time: 13:00, schedule has 14:00 and 15:00 departures
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
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 10, schedule, queueData);
    // First ferry (Malita, 138 cap) drains 138, remaining = 62
    // Second ferry (Nikolaus, 160 cap) drains 160, remaining = -98 → user's ferry
    expect(result.ferry!.name).toBe('MV Nikolaos');
    expect(result.departureTime).toBe('15:00');
  });

  it('queue needs 3 loads — skips two ferries', () => {
    // Need 3 departures to drain 350 cars
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
    // Schedule: 14:00, 15:00, 20:00
    // Malita takes 14:00 (138 cap → remaining 212)
    // Nikolaus takes 15:00 (160 cap → remaining 52)
    // Next: Malita returns. Ready at 14:00 + 25 cross + 15 turn + 25 cross + 15 turn = 14:00 + 80 = 15:20
    // But Malita is already assigned. With only 2 vessels and 3 needed loads,
    // only 2 departures get vessels assigned. Third departure has no vessel ready.
    // So it falls through to "heavy queue" for 350 cars.
    const queueData: PortVehicleDetections = { car: 350, truck: 0, motorbike: 0 };
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 10, schedule, queueData);
    // With 2 assigned departures draining only 298, remaining is still positive
    expect(result.confidence).toBe('low');
    expect(result.reason).toContain('Heavy queue');
  });

  it('queue drain before user arrives — ferry departs before user but still drains queue', () => {
    // Time: 13:00, user arrives at 13:00 + 60 + 15 = 14:15
    // Schedule: 14:00 and 15:00
    // Queue: 100 cars
    // First ferry departs at 14:00 (before user arrives at 14:15) — drains queue
    // Second ferry departs at 15:00 (after user arrives) — user boards this one
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
    const queueData: PortVehicleDetections = { car: 100, truck: 0, motorbike: 0 };
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 60, schedule, queueData);
    // Malita drains 138 at 14:00, remaining <= 0, but 14:00 < user arrival 14:15
    // Nikolaus at 15:00, remaining already <= 0 AND 15:00 >= 14:15 → user's ferry
    expect(result.ferry!.name).toBe('MV Nikolaos');
    expect(result.departureTime).toBe('15:00');
  });

  it('no queue data — behaves like current logic (no skipping)', () => {
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
    // No queueData — should predict first available ferry
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 10, schedule);
    expect(result.ferry!.name).toBe('MV Malita');
    expect(result.departureTime).toBe('14:00');
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
    const result = predictLikelyFerry([malita, nikolaus], 'cirkewwa', 10, schedule, queueData);
    expect(result.ferry!.name).toBe('MV Nikolaos');
    expect(result.departureTime).toBe('15:00');
  });
});

describe('getNextDeparture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T13:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns first departure after user arrival', () => {
    // User arrives at 13:00 + 10 drive + 15 buffer = 13:25
    const result = getNextDeparture('cirkewwa', schedule, 10);
    expect(result).toBe('14:00');
  });

  it('skips past afterTime', () => {
    const result = getNextDeparture('cirkewwa', schedule, 10, '14:00');
    expect(result).toBe('15:00');
  });

  it('returns null when no more departures', () => {
    vi.setSystemTime(new Date('2026-02-10T21:00:00'));
    const result = getNextDeparture('cirkewwa', schedule, 10);
    expect(result).toBeNull();
  });

  it('returns null with no schedule', () => {
    const result = getNextDeparture('cirkewwa', null, 10);
    expect(result).toBeNull();
  });
});
