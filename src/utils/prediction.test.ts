import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { predictTerminalStatus } from './prediction';
import type { Vessel, FerrySchedule } from '../types';

function makeVessel(overrides: Partial<Vessel> = {}): Vessel {
  return {
    MMSI: 237593100,
    LAT: 35.989,
    LON: 14.329,
    SPEED: 0,
    HEADING: 0,
    COURSE: 0,
    TIMESTAMP: Date.now(),
    STATUS: 0,
    name: 'MV Nikolaos',
    isNikolaus: true,
    state: 'UNKNOWN',
    ...overrides,
  };
}

describe('predictTerminalStatus', () => {
  it('returns ALL_CLEAR when nikolaus is null', () => {
    const result = predictTerminalStatus({
      nikolaus: null,
      terminal: 'cirkewwa',
      driveTime: 10,
    });
    expect(result.status).toBe('ALL_CLEAR');
    expect(result.nikolausState).toBe('UNKNOWN');
  });

  describe('docked at this terminal', () => {
    it('returns DOCKED_HERE when user arrives during turnaround (no drive time)', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: null,
      });
      expect(result.status).toBe('DOCKED_HERE');
    });

    it('returns DOCKED_HERE when user arrives soon (drive time < turnaround)', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 0, // arrives in BUFFER_TIME (15) = 15 < TURNAROUND (15)
      });
      expect(result.status).toBe('DOCKED_HERE');
    });

    it('returns ALL_CLEAR when user arrives well after departure', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 30, // arrives in 30 + 15 = 45 > TURNAROUND + 10 = 25
      });
      expect(result.status).toBe('ALL_CLEAR');
    });

    it('returns HEADS_UP when timing is close', () => {
      // userArrivalTime = driveTime + BUFFER(15)
      // CAUTION when > TURNAROUND(15) but <= TURNAROUND + 10 = 25
      // So driveTime + 15 needs to be between 16 and 25 → driveTime 1..10
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 5, // 5 + 15 = 20, which is > 15 but <= 25
      });
      expect(result.status).toBe('HEADS_UP');
    });
  });

  describe('docked at other terminal', () => {
    it('returns ALL_CLEAR for cirkewwa when docked at mgarr', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_MGARR' }),
        terminal: 'cirkewwa',
        driveTime: 10,
      });
      expect(result.status).toBe('ALL_CLEAR');
    });

    it('returns ALL_CLEAR for mgarr when docked at cirkewwa', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'mgarr',
        driveTime: 10,
      });
      expect(result.status).toBe('ALL_CLEAR');
    });
  });

  describe('en route away', () => {
    it('returns ALL_CLEAR for cirkewwa when heading to mgarr', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'EN_ROUTE_TO_MGARR' }),
        terminal: 'cirkewwa',
        driveTime: 10,
      });
      expect(result.status).toBe('ALL_CLEAR');
    });
  });

  describe('en route to this terminal', () => {
    it('returns HEADS_UP when no drive time', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({
          state: 'EN_ROUTE_TO_CIRKEWWA',
          LAT: 36.01,
          LON: 14.31,
          SPEED: 100, // 10 knots
        }),
        terminal: 'cirkewwa',
        driveTime: null,
      });
      expect(result.status).toBe('HEADS_UP');
    });
  });

  describe('unknown state', () => {
    it('returns HEADS_UP', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'UNKNOWN' }),
        terminal: 'cirkewwa',
        driveTime: 10,
      });
      expect(result.status).toBe('HEADS_UP');
    });
  });

  describe('schedule-aware docked at this terminal', () => {
    const schedule: FerrySchedule = {
      date: '2026-02-10',
      cirkewwa: ['06:00', '07:00', '14:00', '15:00', '20:00'],
      mgarr: ['06:30', '07:30', '14:30', '15:30', '20:30'],
    };

    beforeEach(() => {
      vi.useFakeTimers();
      // Fix time to 13:00
      vi.setSystemTime(new Date('2026-02-10T13:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns DOCKED_HERE when next departure is far away and user arrives before it', () => {
      // Time: 13:00, next departure: 14:00 (60 min away)
      // User: driveTime 30 → arrives at 13:45 (45 min) → BEFORE 14:00 departure
      // Without schedule: 45 > TURNAROUND(15) + 10 → ALL_CLEAR (wrong!)
      // With schedule: 45 < 60 → Nikolaus still there → DOCKED_HERE
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 30,
        schedule,
      });
      expect(result.status).toBe('DOCKED_HERE');
    });

    it('returns ALL_CLEAR when next departure is soon and user arrives well after', () => {
      // Time: 13:50, next departure: 14:00 (10 min away)
      // User: driveTime 30 → arrives at 14:35 (45 min) → well AFTER 14:00 + 10
      vi.setSystemTime(new Date('2026-02-10T13:50:00'));
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 30,
        schedule,
      });
      expect(result.status).toBe('ALL_CLEAR');
    });

    it('returns HEADS_UP when timing is close to scheduled departure', () => {
      // Time: 13:00, next departure: 14:00 (60 min away)
      // User: driveTime 50 → arrives at 14:05 (65 min) → 65 > 60 but <= 70
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 50,
        schedule,
      });
      expect(result.status).toBe('HEADS_UP');
    });
  });
});
