import { describe, it, expect } from 'vitest';
import { haversineDistance, calculateBearing, estimateArrivalTime } from './coordinates';

describe('haversineDistance', () => {
  it('returns ~4.7km between Ċirkewwa and Mġarr', () => {
    const dist = haversineDistance(35.989, 14.329, 36.025, 14.299);
    expect(dist).toBeGreaterThan(4.5);
    expect(dist).toBeLessThan(5.0);
  });

  it('returns 0 for the same point', () => {
    expect(haversineDistance(35.989, 14.329, 35.989, 14.329)).toBe(0);
  });

  it('returns ~20000km for antipodal points', () => {
    const dist = haversineDistance(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(20000);
    expect(dist).toBeLessThan(20100);
  });
});

describe('calculateBearing', () => {
  it('returns ~0° for due north', () => {
    const bearing = calculateBearing(35.0, 14.0, 36.0, 14.0);
    expect(bearing).toBeLessThan(1);
  });

  it('returns ~90° for due east', () => {
    const bearing = calculateBearing(35.0, 14.0, 35.0, 15.0);
    expect(bearing).toBeGreaterThan(85);
    expect(bearing).toBeLessThan(95);
  });

  it('returns ~180° for due south', () => {
    const bearing = calculateBearing(36.0, 14.0, 35.0, 14.0);
    expect(bearing).toBeGreaterThan(175);
    expect(bearing).toBeLessThan(185);
  });

  it('returns ~270° for due west', () => {
    const bearing = calculateBearing(35.0, 15.0, 35.0, 14.0);
    expect(bearing).toBeGreaterThan(265);
    expect(bearing).toBeLessThan(275);
  });
});

describe('estimateArrivalTime', () => {
  it('returns correct time for known distance and speed', () => {
    // 10km at 10 knots (100 tenths) = 10 * 1.852 = 18.52 km/h
    // 10km / 18.52 km/h = ~0.54 hours = ~32.4 minutes
    const time = estimateArrivalTime(10, 100);
    expect(time).toBeGreaterThan(32);
    expect(time).toBeLessThan(33);
  });

  it('returns Infinity for zero speed', () => {
    expect(estimateArrivalTime(10, 0)).toBe(Infinity);
  });

  it('returns Infinity for negative speed', () => {
    expect(estimateArrivalTime(10, -5)).toBe(Infinity);
  });
});
