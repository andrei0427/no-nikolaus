import { describe, it, expect } from 'vitest';
import { estimateQueue } from './queueEstimate';

describe('estimateQueue', () => {
  describe('car equivalent calculation', () => {
    it('counts cars directly', () => {
      const result = estimateQueue({ car: 30, truck: 0, motorbike: 0 }, null);
      expect(result.carEquivalent).toBe(30);
    });

    it('counts trucks as 3 car equivalents', () => {
      const result = estimateQueue({ car: 0, truck: 10, motorbike: 0 }, null);
      expect(result.carEquivalent).toBe(30);
    });

    it('counts motorbikes as 0.25 car equivalents', () => {
      const result = estimateQueue({ car: 0, truck: 0, motorbike: 8 }, null);
      expect(result.carEquivalent).toBe(2);
    });

    it('combines all vehicle types', () => {
      const result = estimateQueue({ car: 10, truck: 5, motorbike: 4 }, null);
      // 10 + 15 + 1 = 26
      expect(result.carEquivalent).toBe(26);
    });
  });

  describe('with known ferry capacity', () => {
    it('returns low severity when queue is under 70% capacity', () => {
      // MV Malita capacity = 138, 70% = 96.6
      const result = estimateQueue({ car: 50, truck: 0, motorbike: 0 }, 'MV Malita');
      expect(result.severity).toBe('low');
      expect(result.ferryCapacity).toBe(138);
      expect(result.loadsNeeded).toBe(1);
    });

    it('returns moderate severity when queue is 70-100% capacity', () => {
      const result = estimateQueue({ car: 120, truck: 0, motorbike: 0 }, 'MV Malita');
      expect(result.severity).toBe('moderate');
      expect(result.loadsNeeded).toBe(1);
    });

    it('returns high severity when queue exceeds capacity', () => {
      const result = estimateQueue({ car: 200, truck: 0, motorbike: 0 }, 'MV Malita');
      expect(result.severity).toBe('high');
      expect(result.loadsNeeded).toBe(2);
    });
  });

  describe('without ferry capacity', () => {
    it('returns low for light queue (<= 50)', () => {
      const result = estimateQueue({ car: 30, truck: 0, motorbike: 0 }, null);
      expect(result.severity).toBe('low');
      expect(result.ferryCapacity).toBeNull();
    });

    it('returns moderate for medium queue (51-100)', () => {
      const result = estimateQueue({ car: 75, truck: 0, motorbike: 0 }, null);
      expect(result.severity).toBe('moderate');
    });

    it('returns high for heavy queue (> 100)', () => {
      const result = estimateQueue({ car: 120, truck: 0, motorbike: 0 }, null);
      expect(result.severity).toBe('high');
    });
  });

  describe('unknown ferry name', () => {
    it('falls back to raw count severity', () => {
      const result = estimateQueue({ car: 30, truck: 0, motorbike: 0 }, 'MV Unknown');
      expect(result.ferryCapacity).toBeNull();
      expect(result.loadsNeeded).toBeNull();
      expect(result.severity).toBe('low');
    });
  });
});
