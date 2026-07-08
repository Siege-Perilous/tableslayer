import { parseFogRooms, pointInPolygon, polygonArea, smallestRoomContaining, type FogRoom } from '@tableslayer/stage';
import { describe, expect, it } from 'vitest';

const square = (x: number, y: number, size: number) => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size }
];

const makeRoom = (id: string, points: { x: number; y: number }[], enabled = true): FogRoom => ({
  id,
  points,
  enabled
});

describe('polygonArea', () => {
  it('computes the shoelace area regardless of winding order', () => {
    const points = square(0, 0, 2);
    expect(polygonArea(points)).toBe(4);
    expect(polygonArea([...points].reverse())).toBe(4);
  });

  it('handles triangles', () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 }
      ])
    ).toBe(6);
  });
});

describe('pointInPolygon', () => {
  it('detects points inside and outside a square', () => {
    const points = square(0, 0, 1);
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, points)).toBe(true);
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, points)).toBe(false);
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, points)).toBe(false);
  });

  it('handles concave polygons', () => {
    // A "U" shape: the notch between the prongs is outside
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 0, y: 3 }
    ];
    expect(pointInPolygon({ x: 1.5, y: 2 }, points)).toBe(false); // inside the notch
    expect(pointInPolygon({ x: 0.5, y: 2 }, points)).toBe(true); // left prong
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, points)).toBe(true); // base
  });
});

describe('smallestRoomContaining', () => {
  it('picks the innermost of nested rooms', () => {
    const outer = makeRoom('outer', square(0, 0, 10));
    const inner = makeRoom('inner', square(2, 2, 2));
    expect(smallestRoomContaining([outer, inner], { x: 3, y: 3 })?.id).toBe('inner');
    expect(smallestRoomContaining([outer, inner], { x: 8, y: 8 })?.id).toBe('outer');
  });

  it('includes disabled rooms so they can be toggled back on', () => {
    const room = makeRoom('r1', square(0, 0, 4), false);
    expect(smallestRoomContaining([room], { x: 1, y: 1 })?.id).toBe('r1');
  });

  it('returns null when no room contains the point', () => {
    const room = makeRoom('r1', square(0, 0, 1));
    expect(smallestRoomContaining([room], { x: 5, y: 5 })).toBeNull();
  });

  it('ignores degenerate rooms with fewer than 3 points', () => {
    const degenerate = makeRoom('bad', [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]);
    expect(smallestRoomContaining([degenerate], { x: 0.5, y: 0.5 })).toBeNull();
  });
});

describe('parseFogRooms', () => {
  it('round-trips valid rooms', () => {
    const rooms = [makeRoom('r1', square(0.1, 0.1, 0.5)), makeRoom('r2', square(0.2, 0.2, 0.1), false)];
    expect(parseFogRooms(JSON.stringify(rooms))).toEqual(rooms);
  });

  it('returns [] for null, undefined, or empty input', () => {
    expect(parseFogRooms(null)).toEqual([]);
    expect(parseFogRooms(undefined)).toEqual([]);
    expect(parseFogRooms('')).toEqual([]);
  });

  it('returns [] for corrupt JSON or non-array payloads', () => {
    expect(parseFogRooms('{not json')).toEqual([]);
    expect(parseFogRooms('{"id":"r1"}')).toEqual([]);
  });

  it('drops malformed rooms and keeps valid ones', () => {
    const valid = makeRoom('r1', square(0, 0, 1));
    const payload = JSON.stringify([
      valid,
      { id: 42, points: [], enabled: true },
      { id: 'r3', points: [{ x: 'a', y: 0 }], enabled: true },
      { id: 'r4', points: square(0, 0, 1) } // missing enabled
    ]);
    expect(parseFogRooms(payload)).toEqual([valid]);
  });
});
