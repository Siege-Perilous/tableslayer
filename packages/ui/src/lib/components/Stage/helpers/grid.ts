import * as THREE from 'three';
import { GridType, type GridLayerProps } from '../components/GridLayer/types';
import type { DisplayProps } from '../components/Stage/types';

// Hexagonal grid offset factor
const s = { x: 1.0, y: 1.7320508 }; // sqrt(3)

/**
 * Gets the size of a grid cell in pixels
 * @param gridType Type of grid (square or hex)
 * @param gridSizePixels Base grid size in pixels
 * @returns Width of grid cell in pixels
 */
export function getGridCellSize(grid: GridLayerProps, display: DisplayProps): number {
  return (grid.spacing * display.resolution.x) / display.size.x;
}

/**
 * Snaps a position to the nearest square grid intersection
 * @param position Position to snap in pixels
 * @param spacing Grid spacing in pixels
 * @returns Snapped position in pixels
 */
function snapToSquareGrid(position: THREE.Vector2, spacing: THREE.Vector2): THREE.Vector2 {
  const roundedX = Math.round(position.x / spacing.x) * spacing.x;
  const roundedY = Math.round(position.y / spacing.y) * spacing.y;

  return new THREE.Vector2(roundedX, roundedY);
}

/**
 * Snaps a position to the nearest hexagonal grid center only
 * Exactly matches the shader's getHex implementation
 * @param position Position to snap in pixels
 * @param spacing Grid spacing in pixels
 * @returns The nearest hex center position
 */
function snapToHexCenter(position: THREE.Vector2, spacing: THREE.Vector2): THREE.Vector2 {
  // Exact match of shader's getHex function
  // First normalize by spacing like the shader does: hexUv = getHex(coords / spacing)
  const p = new THREE.Vector2(position.x / spacing.x, position.y / spacing.y);

  // vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  // where s = vec2(1.0, 1.7320508)
  const hC = {
    x: Math.floor(p.x / s.x) + 0.5,
    y: Math.floor(p.y / s.y) + 0.5,
    z: Math.floor((p.x - 0.5) / s.x) + 0.5,
    w: Math.floor((p.y - 1.0) / s.y) + 0.5
  };

  // vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
  const h = {
    x: p.x - hC.x * s.x,
    y: p.y - hC.y * s.y,
    z: p.x - (hC.z + 0.5) * s.x,
    w: p.y - (hC.w + 0.5) * s.y
  };

  // dot(h.xy, h.xy) < dot(h.zw, h.zw)
  const dist1 = h.x * h.x + h.y * h.y;
  const dist2 = h.z * h.z + h.w * h.w;

  // The shader returns the relative position, but we want the actual center
  // So we need to convert back to the center position
  let center: THREE.Vector2;
  if (dist1 < dist2) {
    // First grid center
    center = new THREE.Vector2(hC.x * s.x, hC.y * s.y);
  } else {
    // Second grid center (offset)
    center = new THREE.Vector2((hC.z + 0.5) * s.x, (hC.w + 0.5) * s.y);
  }

  // Scale back to pixel coordinates
  return new THREE.Vector2(center.x * spacing.x, center.y * spacing.y);
}

/**
 * Snaps a position to the nearest hexagonal grid intersection (includes vertices and edges)
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
 * @param grid Grid configuration
 * @param display Display properties
 * @param centerOnly For hex grids, whether to snap to centers only (used for measurements)
 * @returns Snapped position (in normalized 0-1 coordinates)
 */
export function snapToGrid(
  position: THREE.Vector2,
  grid: GridLayerProps,
  display: DisplayProps,
  centerOnly: boolean = false
): THREE.Vector2 {
  // Compute the pixel pitch in inches
  const pixelsPerInch = new THREE.Vector2(display.resolution.x / display.size.x, display.resolution.y / display.size.y);

  // Compute the grid spacing in pixels
  const gridSpacingPixels = new THREE.Vector2(grid.spacing * pixelsPerInch.x, grid.spacing * pixelsPerInch.y);

  if (grid.gridType === GridType.Square) {
    const halfSpacing = new THREE.Vector2(gridSpacingPixels.x / 2.0, gridSpacingPixels.y / 2.0);
    return snapToSquareGrid(position, halfSpacing);
  } else {
    // For hex grids, use center-only snapping if requested (e.g., for measurements)
    if (centerOnly) {
      return snapToHexCenter(position, gridSpacingPixels);
    } else {
      // Otherwise allow snapping to vertices and edges too
      return distanceToHexCenter(position, gridSpacingPixels);
    }
  }
}

// =============================================================================
// HEX GRID COORDINATE FUNCTIONS
// =============================================================================

/**
 * Hex coordinate type using axial coordinates (q, r)
 */
export interface HexCoordinate {
  q: number;
  r: number;
}

/**
 * Cube coordinate type for hex calculations (x, y, z where x + y + z = 0)
 */
export interface CubeCoordinate {
  x: number;
  y: number;
  z: number;
}

/**
 * Rounds fractional hex coordinates to the nearest hex
 * @param hex Fractional hex coordinates
 * @returns Rounded hex coordinates
 */
function hexRound(hex: HexCoordinate): HexCoordinate {
  // Convert to cube coordinates for rounding
  const cube = axialToCube(hex);

  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  // Reset the coordinate with the largest rounding error
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return cubeToAxial({ x: rx, y: ry, z: rz });
}

/**
 * Converts axial hex coordinates to cube coordinates
 * @param hex Axial coordinates
 * @returns Cube coordinates
 */
function axialToCube(hex: HexCoordinate): CubeCoordinate {
  const x = hex.q;
  const z = hex.r;
  const y = -x - z;
  return { x, y, z };
}

/**
 * Converts cube coordinates to axial hex coordinates
 * @param cube Cube coordinates
 * @returns Axial coordinates
 */
function cubeToAxial(cube: CubeCoordinate): HexCoordinate {
  return { q: cube.x, r: cube.z };
}

/**
 * Converts pixel coordinates to hex grid coordinates
 * Returns the grid indices of the hex containing the point
 * @param point Position in pixel coordinates
 * @param spacing Grid spacing in pixels
 * @returns Hex grid coordinates (indices and grid type)
 */
export function pixelToHex(point: THREE.Vector2, spacing: number): HexCoordinate & { isGrid2?: boolean } {
  // Exact match of shader's getHex function
  const p = new THREE.Vector2(point.x / spacing, point.y / spacing);

  // Calculate candidate grid positions
  const hC = {
    x: Math.floor(p.x / s.x) + 0.5,
    y: Math.floor(p.y / s.y) + 0.5,
    z: Math.floor((p.x - 0.5) / s.x) + 0.5,
    w: Math.floor((p.y - 1.0) / s.y) + 0.5
  };

  // Calculate relative positions
  const h = {
    x: p.x - hC.x * s.x,
    y: p.y - hC.y * s.y,
    z: p.x - (hC.z + 0.5) * s.x,
    w: p.y - (hC.w + 0.5) * s.y
  };

  // Choose the closer center
  const dist1 = h.x * h.x + h.y * h.y;
  const dist2 = h.z * h.z + h.w * h.w;

  if (dist1 < dist2) {
    // Grid 1 - use the indices directly
    return { q: Math.floor(hC.x), r: Math.floor(hC.y), isGrid2: false };
  } else {
    // Grid 2 - offset grid
    return { q: Math.floor(hC.z), r: Math.floor(hC.w), isGrid2: true };
  }
}

/**
 * Converts hex grid coordinates to pixel coordinates
 * For flat-topped hexagons in offset coordinate system
 * @param hex Hex grid coordinates in offset format
 * @param spacing Grid spacing in pixels (width of hex)
 * @returns Position in pixel coordinates
 */
export function hexToPixel(hex: HexCoordinate, spacing: number): THREE.Vector2 {
  const hexHeight = spacing * Math.sqrt(3);
  const hexWidth = spacing;

  // Calculate pixel position
  let x: number;
  const y = hex.r * hexHeight * 0.75; // Rows overlap by 1/4

  if (hex.r % 2 === 0) {
    // Even row - no offset
    x = hex.q * hexWidth;
  } else {
    // Odd row - offset by half a hex width
    x = hex.q * hexWidth + hexWidth / 2;
  }

  return new THREE.Vector2(x, y);
}

/**
 * Calculates the hex distance between two hex positions
 * Returns 1 for adjacent hexes, 2 for hexes with one between them, etc.
 * @param hex1 First hex coordinate (with isGrid2 flag)
 * @param hex2 Second hex coordinate (with isGrid2 flag)
 * @returns Number of hexes in the shortest path
 */
export function hexDistance(
  hex1: HexCoordinate & { isGrid2?: boolean },
  hex2: HexCoordinate & { isGrid2?: boolean }
): number {
  // Special case: if the indices and grid types are identical, distance is 0
  if (hex1.q === hex2.q && hex1.r === hex2.r && hex1.isGrid2 === hex2.isGrid2) {
    return 0;
  }

  // For the shader's two-grid system, we can use a simpler approach
  // The grids are offset by (0.5, 0.5) in grid units
  // This creates a regular hex pattern

  // Calculate effective positions in a unified coordinate system
  let q1 = hex1.q * 2; // Scale up to avoid fractions
  let r1 = hex1.r * 2;
  let q2 = hex2.q * 2;
  let r2 = hex2.r * 2;

  // Adjust for grid 2 offset
  if (hex1.isGrid2) {
    q1 += 1;
    r1 += 1;
  }
  if (hex2.isGrid2) {
    q2 += 1;
    r2 += 1;
  }

  // Now we have positions in a unified grid where each hex is at integer coordinates
  // For pointy-top hexagons arranged by the shader's method:
  // Adjacent hexes differ by specific patterns

  const dq = Math.abs(q2 - q1);
  const dr = Math.abs(r2 - r1);

  // For pointy-top hexagons in the shader's two-grid system:
  // Direct neighbors can be at different patterns depending on direction

  // Simple case: same column (dq === 0)
  if (dq === 0) {
    // Moving directly north/south
    // Adjacent hexes are at dr = 1 (switching between grid1 and grid2)
    // Two hexes away are at dr = 2 (same grid type)
    return dr;
  }

  // Same row (dr === 0)
  if (dr === 0) {
    // Moving directly east/west
    // In the shader's arrangement, moving horizontally by 2 units = 1 hex
    return Math.ceil(dq / 2);
  }

  // Diagonal movement in the two-grid system
  // The actual hex distance depends on the specific arrangement
  // Use Manhattan distance as an approximation, then adjust
  const manhattan = dq + dr;

  // In the shader's hex arrangement:
  // - Direct neighbors are at manhattan distance 2 (e.g., (0,0) to (1,1))
  // - Hexes with one between are at manhattan distance 4
  // So we divide by 2
  const distance = Math.ceil(manhattan / 2);

  // However, we need to account for the hex geometry
  // Some diagonal moves are shorter in hex distance
  // If both dq and dr are non-zero and similar, it's a diagonal move
  if (dq > 0 && dr > 0) {
    // For true hex distance, we need to consider that some diagonals are direct neighbors
    // In a hex grid, you can move diagonally in 6 directions
    const minDiff = Math.min(dq, dr);
    const maxDiff = Math.max(dq, dr);

    // If moving equally in both directions, it's a direct diagonal
    if (minDiff === maxDiff) {
      return minDiff;
    }

    // Otherwise, it's a combination of diagonal and straight moves
    return minDiff + Math.ceil((maxDiff - minDiff) / 2);
  }

  return distance;
}
