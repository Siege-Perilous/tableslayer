import type { Point2 } from './mapSpace';

/**
 * Polygon fog "rooms" — persistent fog regions composited on top of the
 * erasable fog-of-war mask. Points are normalized [0-1] mask-UV coordinates
 * (u right, v up, matching the fog texture), making rooms independent of the
 * map's pixel resolution.
 *
 * Kept free of THREE imports so apps/web can share the exact same math.
 */

export interface FogRoom {
  id: string;

  /**
   * Polygon vertices in normalized [0-1] mask-UV coordinates (v up)
   */
  points: Point2[];

  /**
   * Disabled rooms contribute no fog but remain visible to the DM and
   * toggleable via right-click
   */
  enabled: boolean;
}

const isValidPoint = (point: unknown): point is Point2 => {
  if (typeof point !== 'object' || point === null) return false;
  const { x, y } = point as Point2;
  return Number.isFinite(x) && Number.isFinite(y);
};

const isValidRoom = (room: unknown): room is FogRoom => {
  if (typeof room !== 'object' || room === null) return false;
  const { id, points, enabled } = room as FogRoom;
  return typeof id === 'string' && typeof enabled === 'boolean' && Array.isArray(points) && points.every(isValidPoint);
};

/**
 * Parses a persisted fog rooms JSON string, dropping anything malformed
 */
export const parseFogRooms = (json: string | null | undefined): FogRoom[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRoom);
  } catch {
    return [];
  }
};

/**
 * Absolute polygon area via the shoelace formula
 */
export const polygonArea = (points: Point2[]): number => {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
};

/**
 * Ray-cast (even-odd) point-in-polygon test
 */
export const pointInPolygon = (p: Point2, points: Point2[]): boolean => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const crossesRay = a.y > p.y !== b.y > p.y;
    if (crossesRay && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
};

/**
 * Finds the smallest-area room containing the point, so a right-click inside
 * nested rooms always targets the innermost one. Disabled rooms are included —
 * that is how a toggled-off room gets toggled back on.
 */
export const smallestRoomContaining = (rooms: FogRoom[], p: Point2): FogRoom | null => {
  let smallest: FogRoom | null = null;
  let smallestArea = Infinity;
  for (const room of rooms) {
    if (room.points.length < 3 || !pointInPolygon(p, room.points)) continue;
    const area = polygonArea(room.points);
    if (area < smallestArea) {
      smallest = room;
      smallestArea = area;
    }
  }
  return smallest;
};
