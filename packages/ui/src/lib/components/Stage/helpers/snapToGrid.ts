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
function distanceToHexCenter(position: THREE.Vector2, spacing: THREE.Vector2): THREE.Vector2 {
  // This function finds the nearest center in a hexagonal grid. The centers of a
  // hexagonal grid can be represented by two offset square grids. The two grids
  // are offset by half the grid spacing in the x direction and sqrt(3)/2 times
  // the grid spacing in the y direction.

  // Calculate the nearest cell for first grid
  const gridPoints = {
    first: {
      x: Math.floor(position.x / (spacing.x * s.x)) + 0.5,
      y: Math.floor(position.y / (spacing.y * s.y)) + 0.5
    },
    // Offset in x and y directions
    second: {
      x: Math.floor((position.x - s.x * spacing.x * 0.5) / (spacing.x * s.x)) + 0.5,
      y: Math.floor((position.y - s.y * spacing.y * 0.5) / (spacing.y * s.y)) + 0.5
    },
    // Additional grid offset in y direction by spacing/sqrt(3)
    third: {
      x: Math.floor(position.x / (spacing.x * s.x)) + 0.5,
      y: Math.floor((position.y - spacing.y / Math.sqrt(3)) / (spacing.y * s.y)) + 0.5
    },
    // Additional grid offset in y direction by spacing/sqrt(3)
    fourth: {
      x: Math.floor(position.x / (spacing.x * s.x)) + 0.5,
      y: Math.floor((position.y + spacing.y / Math.sqrt(3)) / (spacing.y * s.y)) + 0.5
    }
  };

  // Calculate the centers
  const center1 = new THREE.Vector2(gridPoints.first.x * spacing.x * s.x, gridPoints.first.y * spacing.y * s.y);
  const center2 = new THREE.Vector2(
    (gridPoints.second.x + 0.5) * spacing.x * s.x,
    (gridPoints.second.y + 0.5) * spacing.y * s.y
  );
  const center3 = new THREE.Vector2(
    gridPoints.third.x * spacing.x * s.x,
    gridPoints.third.y * spacing.y * s.y + spacing.y / Math.sqrt(3)
  );
  const center4 = new THREE.Vector2(
    gridPoints.fourth.x * spacing.x * s.x,
    gridPoints.fourth.y * spacing.y * s.y - spacing.y / Math.sqrt(3)
  );

  // Calculate vertices around each center (line intersections)
  const getHexVertices = (center: THREE.Vector2) => {
    const vertices: THREE.Vector2[] = [];
    const radius = spacing.x; // Distance from center to vertex

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      vertices.push(new THREE.Vector2(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle)));
    }
    return vertices;
  };

  // Get vertices for each center
  const vertices1 = getHexVertices(center1);
  const vertices2 = getHexVertices(center2);
  const vertices3 = getHexVertices(center3);
  const vertices4 = getHexVertices(center4);

  // Calculate distances to all points (centers and vertices)
  const distances = [
    { d: Math.pow(position.x - center1.x, 2) + Math.pow(position.y - center1.y, 2), point: center1 },
    { d: Math.pow(position.x - center2.x, 2) + Math.pow(position.y - center2.y, 2), point: center2 },
    { d: Math.pow(position.x - center3.x, 2) + Math.pow(position.y - center3.y, 2), point: center3 },
    { d: Math.pow(position.x - center4.x, 2) + Math.pow(position.y - center4.y, 2), point: center4 },
    ...vertices1.map((v) => ({
      d: Math.pow(position.x - v.x, 2) + Math.pow(position.y - v.y, 2),
      point: v
    })),
    ...vertices2.map((v) => ({
      d: Math.pow(position.x - v.x, 2) + Math.pow(position.y - v.y, 2),
      point: v
    })),
    ...vertices3.map((v) => ({
      d: Math.pow(position.x - v.x, 2) + Math.pow(position.y - v.y, 2),
      point: v
    })),
    ...vertices4.map((v) => ({
      d: Math.pow(position.x - v.x, 2) + Math.pow(position.y - v.y, 2),
      point: v
    }))
  ];

  // Find the closest point
  const closest = distances.reduce((prev, curr) => (curr.d < prev.d ? curr : prev));

  return closest.point;
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
    return snapToSquareGrid(position, halfSpacing);
  } else {
    return distanceToHexCenter(position, gridSpacingPixels);
  }
}
