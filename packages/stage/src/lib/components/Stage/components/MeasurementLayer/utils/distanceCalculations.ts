import * as THREE from 'three';
import { hexDistance, pixelToHex, type HexCoordinate } from '../../../helpers/grid';
import { GridType } from '../../GridLayer/types';
import type { DiagonalRule } from '../types';

/**
 * Calculate hex grid distance between two points
 * @param startPoint Start point in pixel coordinates
 * @param endPoint End point in pixel coordinates
 * @param gridSpacing Grid spacing in inches
 * @param displaySize Display size in inches
 * @param displayResolution Display resolution in pixels
 * @param worldGridSize The real-world size of one hex
 * @param returnHexCount If true, returns hex count instead of world units
 * @returns Distance in world grid units or hex count
 */
export function calculateHexGridDistance(
  startPoint: THREE.Vector2,
  endPoint: THREE.Vector2,
  gridSpacing: number,
  displaySize: { x: number; y: number },
  displayResolution: { x: number; y: number },
  worldGridSize: number = 5,
  returnHexCount: boolean = false
): number {
  // Convert pixel coordinates to world coordinates (inches)
  const pixelsPerInchX = displayResolution.x / displaySize.x;

  // Calculate hex size in pixels
  // The grid spacing represents the distance between hex centers
  // For pointy-top hexagons, this is the width of the hex
  const hexSizePixels = gridSpacing * pixelsPerInchX;

  // Convert points to hex coordinates
  const startHex = pixelToHex(startPoint, hexSizePixels) as HexCoordinate & { isGrid2?: boolean };
  const endHex = pixelToHex(endPoint, hexSizePixels) as HexCoordinate & { isGrid2?: boolean };

  // Calculate distance in hex units
  const hexes = hexDistance(startHex, endHex);

  // Return either hex count or world units
  return returnHexCount ? hexes : hexes * worldGridSize;
}

/**
 * Count squares between two cells where diagonals alternate between one and two
 * units (D&D 3.5E / Pathfinder, and the D&D 5E DMG optional rule)
 */
export const calculateAlternatingDiagonalDistance = (dx: number, dy: number): number => {
  const diagonalMoves = Math.min(dx, dy);
  const straightMoves = Math.max(dx, dy) - diagonalMoves;
  return straightMoves + diagonalMoves + Math.floor(diagonalMoves / 2);
};

/**
 * Calculate the distance between two points in world grid units.
 * Snapped square grids count squares entered using the diagonal rule: with
 * '5e' every square, including diagonals, counts as one grid unit; with
 * 'alternating' diagonals alternate between one and two. Otherwise the
 * straight-line distance is rounded to the nearest whole grid unit.
 * @param startPoint Start point in pixel coordinates
 * @param endPoint End point in pixel coordinates
 * @param gridSpacing Grid spacing in inches
 * @param displaySize Display size in inches
 * @param displayResolution Display resolution in pixels
 * @param gridType Type of grid (square or hex)
 * @param snapToGrid Whether snapping is enabled
 * @param worldGridSize The real-world size of one grid square
 * @param diagonalRule How diagonals are counted on a snapped square grid
 * @returns Distance in world grid units
 */
export function calculateLineDistance(
  startPoint: THREE.Vector2,
  endPoint: THREE.Vector2,
  gridSpacing: number,
  displaySize: { x: number; y: number },
  displayResolution: { x: number; y: number },
  gridType: GridType = GridType.Square,
  snapToGrid: boolean = false,
  worldGridSize: number = 5,
  diagonalRule: DiagonalRule = '5e'
): number {
  if (gridType === GridType.Hex && snapToGrid) {
    return calculateHexGridDistance(startPoint, endPoint, gridSpacing, displaySize, displayResolution, worldGridSize);
  }

  const pixelsPerInchX = displayResolution.x / displaySize.x;
  const pixelsPerInchY = displayResolution.y / displaySize.y;

  const dx = Math.abs(endPoint.x - startPoint.x) / pixelsPerInchX / gridSpacing;
  const dy = Math.abs(endPoint.y - startPoint.y) / pixelsPerInchY / gridSpacing;

  if (!snapToGrid) {
    return Math.round(Math.hypot(dx, dy)) * worldGridSize;
  }

  const cellsX = Math.round(dx);
  const cellsY = Math.round(dy);
  const cells =
    diagonalRule === 'alternating' ? calculateAlternatingDiagonalDistance(cellsX, cellsY) : Math.max(cellsX, cellsY);
  return cells * worldGridSize;
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
