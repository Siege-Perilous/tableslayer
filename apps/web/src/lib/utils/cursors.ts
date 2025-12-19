/**
 * Cursor data from Y.js awareness
 */
export type CursorData = {
  worldPosition: { x: number; y: number; z: number };
  userId: string;
  color?: string;
  label?: string;
  lastMoveTime: number;
  fadedOut: boolean;
};

/**
 * Cursor data formatted for CursorLayer component
 */
export type CursorLayerData = {
  id: string;
  worldPosition: { x: number; y: number; z: number };
  color: string;
  label: string;
  opacity: number;
  lastUpdateTime: number;
};

/**
 * Transform cursor record from Y.js awareness to array format for CursorLayer
 *
 * @param cursors - Record of user ID to cursor data
 * @returns Array of cursor data formatted for CursorLayer component
 */
export function transformCursorsToArray(cursors: Record<string, CursorData>): CursorLayerData[] {
  return Object.entries(cursors).map(([id, cursor]) => ({
    id,
    worldPosition: cursor.worldPosition || { x: 0, y: 0, z: 0 },
    color: cursor.color || '#ffffff',
    label: cursor.label || cursor.userId,
    opacity: cursor.fadedOut ? 0 : 1,
    lastUpdateTime: cursor.lastMoveTime
  }));
}
