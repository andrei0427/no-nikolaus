import { describe, it, expect } from 'vitest';
import { predictTerminalStatus } from './prediction';
import type { Vessel } from '../types';

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
  it('returns SAFE when nikolaus is null', () => {
    const result = predictTerminalStatus({
      nikolaus: null,
      terminal: 'cirkewwa',
      driveTime: 10,
    });
    expect(result.status).toBe('SAFE');
    expect(result.nikolausState).toBe('UNKNOWN');
  });

  describe('docked at this terminal', () => {
    it('returns AVOID when user arrives during turnaround (no drive time)', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: null,
      });
      expect(result.status).toBe('AVOID');
    });

    it('returns AVOID when user arrives soon (drive time < turnaround)', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 0, // arrives in BUFFER_TIME (15) = 15 < TURNAROUND (15)
      });
      expect(result.status).toBe('AVOID');
    });

    it('returns SAFE when user arrives well after departure', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 30, // arrives in 30 + 15 = 45 > TURNAROUND + 10 = 25
      });
      expect(result.status).toBe('SAFE');
    });

    it('returns CAUTION when timing is close', () => {
      // userArrivalTime = driveTime + BUFFER(15)
      // CAUTION when > TURNAROUND(15) but <= TURNAROUND + 10 = 25
      // So driveTime + 15 needs to be between 16 and 25 → driveTime 1..10
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'cirkewwa',
        driveTime: 5, // 5 + 15 = 20, which is > 15 but <= 25
      });
      expect(result.status).toBe('CAUTION');
    });
  });

  describe('docked at other terminal', () => {
    it('returns SAFE for cirkewwa when docked at mgarr', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_MGARR' }),
        terminal: 'cirkewwa',
        driveTime: 10,
      });
      expect(result.status).toBe('SAFE');
    });

    it('returns SAFE for mgarr when docked at cirkewwa', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'DOCKED_CIRKEWWA' }),
        terminal: 'mgarr',
        driveTime: 10,
      });
      expect(result.status).toBe('SAFE');
    });
  });

  describe('en route away', () => {
    it('returns SAFE for cirkewwa when heading to mgarr', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'EN_ROUTE_TO_MGARR' }),
        terminal: 'cirkewwa',
        driveTime: 10,
      });
      expect(result.status).toBe('SAFE');
    });
  });

  describe('en route to this terminal', () => {
    it('returns CAUTION when no drive time', () => {
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
      expect(result.status).toBe('CAUTION');
    });
  });

  describe('unknown state', () => {
    it('returns CAUTION', () => {
      const result = predictTerminalStatus({
        nikolaus: makeVessel({ state: 'UNKNOWN' }),
        terminal: 'cirkewwa',
        driveTime: 10,
      });
      expect(result.status).toBe('CAUTION');
    });
  });
});
