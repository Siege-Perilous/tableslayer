import * as THREE from 'three';
import { hexDistance, pixelToHex, type HexCoordinate } from '../../../helpers/grid';
import { GridType } from '../../GridLayer/types';

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
 * Calculate grid-based distance between two points
 * @param startPoint Start point in pixel coordinates
 * @param endPoint End point in pixel coordinates
 * @param gridSpacing Grid spacing in inches
 * @param displaySize Display size in inches
 * @param displayResolution Display resolution in pixels
 * @param gridType Type of grid (square or hex)
 * @param snapToGrid Whether snapping is enabled
 * @param enableDMG252 Whether to use DMG 252 diagonal rules
 * @param worldGridSize The real-world size of one grid square
 * @param worldGridUnits The units for the world grid size
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
  enableDMG252: boolean = false,
  worldGridSize: number = 5,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _worldGridUnits: string = 'FT'
): number {
  // For hex grids with snapping enabled, use hex pathfinding
  if (gridType === GridType.Hex && snapToGrid) {
    return calculateHexGridDistance(startPoint, endPoint, gridSpacing, displaySize, displayResolution, worldGridSize);
  }

  // Convert pixel coordinates to world coordinates (inches)
  const pixelsPerInchX = displayResolution.x / displaySize.x;
  const pixelsPerInchY = displayResolution.y / displaySize.y;

  // Convert to inches
  const startInches = new THREE.Vector2(startPoint.x / pixelsPerInchX, startPoint.y / pixelsPerInchY);
  const endInches = new THREE.Vector2(endPoint.x / pixelsPerInchX, endPoint.y / pixelsPerInchY);

  // If DMG 252 rules are enabled and we're snapping to a square grid
  if (enableDMG252 && snapToGrid && gridType === GridType.Square) {
    // Convert to grid coordinates (number of grid squares)
    const startGrid = new THREE.Vector2(startInches.x / gridSpacing, startInches.y / gridSpacing);
    const endGrid = new THREE.Vector2(endInches.x / gridSpacing, endInches.y / gridSpacing);

    // Calculate grid distance using DMG 252 rules, then convert to world units
    const gridDistance = calculateDMG252Distance(startGrid, endGrid);
    return gridDistance * worldGridSize;
  }

  // Standard distance calculation - convert to world grid units
  const distanceInches = startInches.distanceTo(endInches);
  const gridDistance = distanceInches / gridSpacing;
  return gridDistance * worldGridSize;
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
 * Calculate distance using DMG 252 diagonal movement rules
 * First diagonal = 1 grid unit, second = 2 grid units, alternating
 * Only applies when snapping to square grid
 */
export function calculateDMG252Distance(startPoint: THREE.Vector2, endPoint: THREE.Vector2): number {
  const dx = Math.abs(endPoint.x - startPoint.x);
  const dy = Math.abs(endPoint.y - startPoint.y);

  // Get the number of diagonal and straight moves
  const diagonalMoves = Math.min(dx, dy);
  const straightMoves = Math.max(dx, dy) - diagonalMoves;

  // Calculate diagonal cost using DMG 252 rules
  // Every other diagonal costs 2 units instead of 1
  const fullDiagonalPairs = Math.floor(diagonalMoves / 2);
  const remainingDiagonals = diagonalMoves % 2;

  const diagonalCost = fullDiagonalPairs * 3 + remainingDiagonals * 1; // 3 = 1 + 2 for each pair
  const straightCost = straightMoves;

  return diagonalCost + straightCost;
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
