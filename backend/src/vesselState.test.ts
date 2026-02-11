import { describe, it, expect } from 'vitest';
import { determineVesselState } from './vesselState.js';
import type { VesselData } from './types.js';

function makeVesselData(overrides: Partial<VesselData> = {}): VesselData {
  return {
    MMSI: 215145000,
    LAT: 35.5,
    LON: 14.3,
    SPEED: 0,
    HEADING: 0,
    COURSE: 0,
    TIMESTAMP: Date.now(),
    STATUS: 0,
    ...overrides,
  };
}

describe('determineVesselState', () => {
  describe('docked states', () => {
    it('returns DOCKED_CIRKEWWA when near Ċirkewwa and not moving', () => {
      const vessel = makeVesselData({
        LAT: 35.989,
        LON: 14.329,
        SPEED: 0,
      });
      expect(determineVesselState(vessel)).toBe('DOCKED_CIRKEWWA');
    });

    it('returns DOCKED_MGARR when near Mġarr and not moving', () => {
      const vessel = makeVesselData({
        LAT: 36.025,
        LON: 14.299,
        SPEED: 0,
      });
      expect(determineVesselState(vessel)).toBe('DOCKED_MGARR');
    });

    it('returns DOCKED even with low speed below threshold', () => {
      const vessel = makeVesselData({
        LAT: 35.989,
        LON: 14.329,
        SPEED: 5, // below threshold of 10
      });
      expect(determineVesselState(vessel)).toBe('DOCKED_CIRKEWWA');
    });
  });

  describe('en route states', () => {
    it('returns EN_ROUTE_TO_CIRKEWWA for heading 90-180°', () => {
      const vessel = makeVesselData({
        LAT: 36.007,
        LON: 14.314,
        SPEED: 100,
        HEADING: 135,
        COURSE: 0, // COURSE is 0, falls back to HEADING
      });
      expect(determineVesselState(vessel)).toBe('EN_ROUTE_TO_CIRKEWWA');
    });

    it('returns EN_ROUTE_TO_MGARR for heading outside 90-180°', () => {
      const vessel = makeVesselData({
        LAT: 36.007,
        LON: 14.314,
        SPEED: 100,
        HEADING: 315,
        COURSE: 0,
      });
      expect(determineVesselState(vessel)).toBe('EN_ROUTE_TO_MGARR');
    });

    it('prefers COURSE over HEADING when COURSE > 0', () => {
      const vessel = makeVesselData({
        LAT: 36.007,
        LON: 14.314,
        SPEED: 100,
        HEADING: 315, // would be MGARR
        COURSE: 135, // overrides to CIRKEWWA
      });
      expect(determineVesselState(vessel)).toBe('EN_ROUTE_TO_CIRKEWWA');
    });

    it('returns EN_ROUTE_TO_CIRKEWWA at boundary heading 90°', () => {
      const vessel = makeVesselData({
        LAT: 36.007,
        LON: 14.314,
        SPEED: 100,
        HEADING: 90,
        COURSE: 0,
      });
      expect(determineVesselState(vessel)).toBe('EN_ROUTE_TO_CIRKEWWA');
    });

    it('returns EN_ROUTE_TO_CIRKEWWA at boundary heading 180°', () => {
      const vessel = makeVesselData({
        LAT: 36.007,
        LON: 14.314,
        SPEED: 100,
        HEADING: 180,
        COURSE: 0,
      });
      expect(determineVesselState(vessel)).toBe('EN_ROUTE_TO_CIRKEWWA');
    });
  });

  describe('unknown state', () => {
    it('returns UNKNOWN when far from both terminals and not moving', () => {
      const vessel = makeVesselData({
        LAT: 35.5,
        LON: 14.5,
        SPEED: 0,
      });
      expect(determineVesselState(vessel)).toBe('UNKNOWN');
    });
  });
});
