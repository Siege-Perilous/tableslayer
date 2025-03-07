import * as THREE from 'three';
import { GridType, type GridLayerProps } from '../components/GridLayer/types';
import type { DisplayProps } from '../components/Stage/types';

// Hexagonal grid offset factor
const s = { x: 1.0, y: 1.7320508 }; // sqrt(3)

/**
 * Snaps a position to the nearest square grid intersection
 * @param position Position to snap in pixels
 * @param spacing Grid spacing in pixels
 * @returns Snapped position in pixels
 */
function snapToSquareGrid(position: THREE.Vector2, spacing: THREE.Vector2): THREE.Vector2 {
  return new THREE.Vector2(
    Math.round(position.x / spacing.x) * spacing.x,
    Math.round(position.y / spacing.y) * spacing.y
  );
}

/**
 * Snaps a position to the nearest hexagonal grid intersection
 * Based on the shader's hexagonal grid implementation
 * @param position Position to snap in pixels
 * @param spacing Grid spacing in pixels
 * @returns The distance to the nearest center and the center
 */
function distanceToHexCenter(
  position: THREE.Vector2,
  spacing: THREE.Vector2
): {
  d: number;
  center: THREE.Vector2;
} {
  // This function finds the nearest center in a hexagonal grid. The centers of a
  // hexagonal grid can be represented by two offset square grids. The two grids
  // are offset by half the grid spacing in the x direction and sqrt(3)/2 times
  // the grid spacing in the y direction.

  // Calculate near center of the two grids
  const hC = {
    xy: {
      x: Math.floor(position.x / (spacing.x * s.x)) + 0.5,
      y: Math.floor(position.y / (spacing.y * s.y)) + 0.5
    },
    zw: {
      x: Math.floor((position.x - s.x * spacing.x * 0.5) / (spacing.x * s.x)) + 0.5,
      y: Math.floor((position.y - s.y * spacing.y * 0.5) / (spacing.y * s.y)) + 0.5
    }
  };

  // Calculate the two potential hex centers in original space
  const center1 = new THREE.Vector2(hC.xy.x * spacing.x * s.x, hC.xy.y * spacing.y * s.y);
  const center2 = new THREE.Vector2((hC.zw.x + 0.5) * spacing.x * s.x, (hC.zw.y + 0.5) * spacing.y * s.y);

  const d1 = Math.pow(position.x - center1.x, 2) + Math.pow(position.y - center1.y, 2);
  const d2 = Math.pow(position.x - center2.x, 2) + Math.pow(position.y - center2.y, 2);

  // Return the closest center
  return {
    d: d1 < d2 ? d1 : d2,
    center: d1 < d2 ? center1 : center2
  };
}

/**
 * Snaps a position to the nearest grid intersection based on the current grid configuration
 * @param position Position to snap (in normalized 0-1 coordinates)
 * @param config Grid configuration
 * @returns Snapped position (in normalized 0-1 coordinates)
 */
export function snapToGrid(position: THREE.Vector2, grid: GridLayerProps, display: DisplayProps): THREE.Vector2 {
  // These calculations match the shader's calculations for the grid
  const safeZoneSize = new THREE.Vector2(
    display.resolution.x - display.padding.x * 2,
    display.resolution.y - display.padding.y * 2
  );

  // Compute the pixel pitch in inches
  const pixelsPerInch = new THREE.Vector2(display.resolution.x / display.size.x, display.resolution.y / display.size.y);

  // Compute the grid spacing in pixels
  const gridSpacingPixels = new THREE.Vector2(grid.spacing * pixelsPerInch.x, grid.spacing * pixelsPerInch.y);

  // Compute the number of grid squares that can fit inside the safe zone
  const gridCount = new THREE.Vector2(
    Math.floor(safeZoneSize.x / gridSpacingPixels.x),
    Math.floor(safeZoneSize.y / gridSpacingPixels.y)
  );

  // Compute the total grid size in pixels, then compute the position of the fragment
  // relative to the origin (lower left)
  const gridSizePixels = new THREE.Vector2(gridSpacingPixels.x * gridCount.x, gridSpacingPixels.y * gridCount.y);

  // Compute the origin of the grid in pixels
  const gridOriginPixels = new THREE.Vector2(gridSizePixels.x / 2.0, gridSizePixels.y / 2.0);
  const halfSpacing = new THREE.Vector2(gridSpacingPixels.x / 2.0, gridSpacingPixels.y / 2.0);

  if (grid.gridType === GridType.Square) {
    // Compute the position of the point relative to the grid origin
    const gridPosition = new THREE.Vector2(position.x - gridOriginPixels.x, position.y - gridOriginPixels.y);

    // Snap to grid
    // For square grids, snap to half the grid spacing
    // For hexagonal grids, snap to the grid spacing and center of hex
    return snapToSquareGrid(gridPosition, halfSpacing);
  } else {
    const hex = distanceToHexCenter(position, gridSpacingPixels);

    return hex.center;
  }
}
