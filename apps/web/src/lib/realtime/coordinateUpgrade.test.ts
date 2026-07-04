import { describe, expect, it } from 'vitest';
import { reconcileGridCount } from './coordinateUpgrade';

// 1920px / 38.4in = 50 px per inch, 1-inch cells → 50 display px per cell
const base = {
  gridSpacing: 1,
  displayResolutionX: 1920,
  displaySizeX: 38.4,
  mapZoom: 0.65,
  gridMapDefinedX: 24 as number | null,
  gridMapDefinedY: 17 as number | null
};

describe('reconcileGridCount', () => {
  it('overrides a stale default count with the count implied by the map transform', () => {
    // 3000x2100 map at zoom 0.65 → 39 x 27.3 cells of 50px; stored 24x17 is
    // the old default that only bounded the legacy display-space grid
    expect(reconcileGridCount(base, { width: 3000, height: 2100 })).toEqual({ x: 39, y: 27 });
  });

  it('keeps a stored count that matches the implied count (filename-derived scenes)', () => {
    const settings = { ...base, mapZoom: 0.5, gridMapDefinedX: 30, gridMapDefinedY: 20 };
    expect(reconcileGridCount(settings, { width: 3000, height: 2000 })).toBeNull();
  });

  it('tolerates rounding wobble of one cell from axis-averaged zoom', () => {
    // Implied 31x20 vs stored 30x20 — within the ±1 guard, keep the stored count
    const settings = { ...base, mapZoom: 0.515, gridMapDefinedX: 30, gridMapDefinedY: 20 };
    expect(reconcileGridCount(settings, { width: 3000, height: 2000 })).toBeNull();
  });

  it('always fills in a missing count', () => {
    const settings = { ...base, mapZoom: 0.5, gridMapDefinedX: null, gridMapDefinedY: null };
    expect(reconcileGridCount(settings, { width: 3000, height: 2000 })).toEqual({ x: 30, y: 20 });
  });

  it('derives the map-frame count regardless of rotation', () => {
    // Portrait 2000x3000 map: 20 cells along the image width, 30 down its height
    const settings = { ...base, mapZoom: 0.5, gridMapDefinedX: null, gridMapDefinedY: null };
    expect(reconcileGridCount(settings, { width: 2000, height: 3000 })).toEqual({ x: 20, y: 30 });
  });
});
