import * as THREE from 'three';

/**
 * Calculate straight-line distance between two points
 */
export function calculateLineDistance(startPoint: THREE.Vector2, endPoint: THREE.Vector2): number {
  return startPoint.distanceTo(endPoint);
}

/**
 * Calculate D&D diagonal movement distance
 * In D&D, diagonal movement costs 1.5 times normal movement
 * This is implemented as: max(dx, dy) + min(dx, dy) * 0.5
 */
export function calculateDnDDiagonalDistance(startPoint: THREE.Vector2, endPoint: THREE.Vector2): number {
  const dx = Math.abs(endPoint.x - startPoint.x);
  const dy = Math.abs(endPoint.y - startPoint.y);
  return Math.max(dx, dy) + Math.min(dx, dy) * 0.5;
}

/**
 * Calculate radius from center point to edge point
 */
export function calculateRadius(centerPoint: THREE.Vector2, edgePoint: THREE.Vector2): number {
  return centerPoint.distanceTo(edgePoint);
}

/**
 * Calculate area of a circle
 */
export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

/**
 * Calculate area of a square
 */
export function calculateSquareArea(sideLength: number): number {
  return sideLength * sideLength;
}

/**
 * Convert pixels to game units (assuming 1 inch = 1 unit)
 * This is a placeholder - actual conversion depends on grid scale
 */
export function pixelsToUnits(pixels: number, pixelsPerUnit: number = 1): number {
  return pixels / pixelsPerUnit;
}

/**
 * Convert game units to pixels
 */
export function unitsToPixels(units: number, pixelsPerUnit: number = 1): number {
  return units * pixelsPerUnit;
}
