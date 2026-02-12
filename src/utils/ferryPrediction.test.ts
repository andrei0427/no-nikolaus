import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { predictLikelyFerry, getNextDeparture } from './ferryPrediction';
import type { Vessel, FerrySchedule } from '../types';

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
