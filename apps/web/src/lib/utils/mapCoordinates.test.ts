import { displayToMapSpace, getAlignedMapTransform, getLockedMapZoom, mapToDisplaySpace } from '@tableslayer/stage';
import { describe, expect, it } from 'vitest';

// 1920x1080 at 50 px/inch, 1-inch grid squares
const display = { resolution: { x: 1920, y: 1080 }, size: { x: 38.4, y: 21.6 } };
const grid = (x: number, y: number) => ({ fixedGridCount: { x, y }, spacing: 1 });

describe('displayToMapSpace / mapToDisplaySpace', () => {
  it('is the identity for the identity transform', () => {
    const map = { offset: { x: 0, y: 0 }, rotation: 0, zoom: 1 };
    expect(displayToMapSpace({ x: 123.5, y: -42 }, map)).toEqual({ x: 123.5, y: -42 });
  });

  it('subtracts the offset and divides by zoom at rotation 0', () => {
    const map = { offset: { x: 100, y: -50 }, rotation: 0, zoom: 2 };
    expect(displayToMapSpace({ x: 300, y: 150 }, map)).toEqual({ x: 100, y: 100 });
    expect(mapToDisplaySpace({ x: 100, y: 100 }, map)).toEqual({ x: 300, y: 150 });
  });

  it('unwinds a 90 degree rotation', () => {
    const map = { offset: { x: 0, y: 0 }, rotation: 90, zoom: 1 };
    // A map rotated +90° carries its local +x axis onto display +y
    const result = mapToDisplaySpace({ x: 1, y: 0 }, map);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(1, 10);
  });

  it.each([0, 90, 180, 270, 37.5, -90])('round-trips at rotation %s', (rotation) => {
    const map = { offset: { x: 217.3, y: -88.1 }, rotation, zoom: 0.63 };
    const original = { x: -412.7, y: 305.2 };
    const roundTripped = mapToDisplaySpace(displayToMapSpace(original, map), map);
    expect(roundTripped.x).toBeCloseTo(original.x, 8);
    expect(roundTripped.y).toBeCloseTo(original.y, 8);
  });
});

describe('getLockedMapZoom', () => {
  it('locks one map grid cell to one display grid cell', () => {
    // 2000x1400 map with a 20x14 grid: 100 map px per cell, 50 display px per cell
    expect(getLockedMapZoom(grid(20, 14), display, { width: 2000, height: 1400 })).toBeCloseTo(0.5, 10);
  });

  it('is invariant under rotation: the count describes the map image', () => {
    // Portrait 1400x2000 image with a 14x20 grid — same 100px cells
    expect(getLockedMapZoom(grid(14, 20), display, { width: 1400, height: 2000 })).toBeCloseTo(0.5, 10);
  });
});

describe('getAlignedMapTransform', () => {
  it('centers a map that fits the display rect', () => {
    const aligned = getAlignedMapTransform(grid(20, 14), display, { width: 2000, height: 1400 });
    expect(aligned.rotation).toBe(0);
    expect(aligned.zoom).toBeCloseTo(0.5, 10);
    expect(aligned.offset).toEqual({ x: 0, y: 0 });
  });

  it('rotates a portrait map onto a landscape display', () => {
    // 14 cells across the image's width, 20 down its height (100px cells)
    const aligned = getAlignedMapTransform(grid(14, 20), display, { width: 1400, height: 2000 });
    expect(aligned.rotation).toBe(90);
    expect(aligned.zoom).toBeCloseTo(0.5, 10);
  });

  it('aligns the top-left corner when the map overflows the display rect', () => {
    // 8000x6000 with 40x30 cells: 200 map px per cell, zoom 0.25 → 2000x1500 scaled
    const aligned = getAlignedMapTransform(grid(40, 30), display, { width: 8000, height: 6000 });
    expect(aligned.zoom).toBeCloseTo(0.25, 10);
    // Left edges align: -1920/2 + 2000/2 = 40; top edges align: 1080/2 - 1500/2 = -210
    expect(aligned.offset.x).toBeCloseTo(40, 10);
    expect(aligned.offset.y).toBeCloseTo(-210, 10);
  });
});
