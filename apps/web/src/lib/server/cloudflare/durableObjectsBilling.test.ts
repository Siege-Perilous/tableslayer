import { describe, expect, it } from 'vitest';
import {
  billingCycleBounds,
  estimateCostUsd,
  gbSecondsFromActiveTimeMicros,
  projectCycle
} from './durableObjectsBilling';

describe('billingCycleBounds', () => {
  it('uses this month when now is on or after the start day', () => {
    const cycle = billingCycleBounds(Date.UTC(2026, 8, 20), 12);
    expect(cycle).toEqual({ start: Date.UTC(2026, 8, 12), end: Date.UTC(2026, 9, 12) });
  });

  it('uses the previous month before the start day', () => {
    const cycle = billingCycleBounds(Date.UTC(2026, 8, 5), 12);
    expect(cycle).toEqual({ start: Date.UTC(2026, 7, 12), end: Date.UTC(2026, 8, 12) });
  });

  it('crosses year boundaries', () => {
    expect(billingCycleBounds(Date.UTC(2027, 0, 3), 12)).toEqual({
      start: Date.UTC(2026, 11, 12),
      end: Date.UTC(2027, 0, 12)
    });
    expect(billingCycleBounds(Date.UTC(2026, 11, 20), 12)).toEqual({
      start: Date.UTC(2026, 11, 12),
      end: Date.UTC(2027, 0, 12)
    });
  });

  it('clamps the start day to short months', () => {
    expect(billingCycleBounds(Date.UTC(2026, 1, 27, 12), 31)).toEqual({
      start: Date.UTC(2026, 0, 31),
      end: Date.UTC(2026, 1, 28)
    });
  });
});

describe('cost arithmetic', () => {
  it('converts active microseconds at 128 MB', () => {
    expect(gbSecondsFromActiveTimeMicros(8_000_000)).toBe(1);
  });

  it('rounds up to the next unit past the allowance', () => {
    expect(estimateCostUsd(0)).toBe(0);
    expect(estimateCostUsd(400_000)).toBe(0);
    expect(estimateCostUsd(417_000)).toBe(12.5);
    expect(estimateCostUsd(1_400_000)).toBe(12.5);
    expect(estimateCostUsd(1_400_001)).toBe(25);
  });

  it('projects straight-line across the cycle', () => {
    const cycle = { start: 0, end: 30 * 86_400_000 };
    expect(projectCycle(100, cycle, 15 * 86_400_000)).toBe(200);
    expect(projectCycle(100, cycle, 30 * 86_400_000)).toBe(100);
  });
});
