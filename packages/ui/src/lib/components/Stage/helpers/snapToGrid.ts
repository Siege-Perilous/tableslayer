import * as THREE from 'three';
import { GridType } from '../components/GridLayer/types';
interface GridConfig {
  gridType: GridType;
  spacing: number;
  gridSize: THREE.Vector2;
  gridOrigin: THREE.Vector2;
}

/**
 * Snaps a position to the nearest square grid intersection
 * @param position Position to snap in pixels
 * @param spacing Grid spacing in pixels
 * @returns Snapped position in pixels
 */
function snapToSquareGrid(position: THREE.Vector2, spacing: number): THREE.Vector2 {
  return new THREE.Vector2(Math.round(position.x / spacing) * spacing, Math.round(position.y / spacing) * spacing);
}

/**
 * Snaps a position to the nearest hexagonal grid intersection
 * Based on the shader's hexagonal grid implementation
 * @param position Position to snap in pixels
 * @param spacing Grid spacing in pixels
 * @returns Snapped position in pixels
 */
function snapToHexGrid(position: THREE.Vector2, spacing: number): THREE.Vector2 {
  // Hex grid constants from shader
  const s = { x: 1.0, y: 1.7320508 }; // sqrt(3)

  // Calculate the two potential hex centers as in the shader
  const hC = {
    xy: {
      x: Math.floor(position.x / (spacing * s.x)) + 0.5,
      y: Math.floor(position.y / (spacing * s.y)) + 0.5
    },
    zw: {
      x: Math.floor((position.x - spacing * 0.5) / (spacing * s.x)) + 0.5,
      y: Math.floor((position.y - spacing) / (spacing * s.y)) + 0.5
    }
  };

  // Calculate the two potential hex centers in original space
  const center1 = new THREE.Vector2(hC.xy.x * spacing * s.x, hC.xy.y * spacing * s.y);

  const center2 = new THREE.Vector2((hC.zw.x + 0.5) * spacing * s.x, (hC.zw.y + 0.5) * spacing * s.y);

  // Calculate distances to both centers
  const dist1 = Math.pow(position.x - center1.x, 2) + Math.pow(position.y - center1.y, 2);
  const dist2 = Math.pow(position.x - center2.x, 2) + Math.pow(position.y - center2.y, 2);

  // Return the closest center
  return dist1 < dist2 ? center1 : center2;
}

/**
 * Snaps a position to the nearest grid intersection based on the current grid configuration
 * @param position Position to snap (in normalized 0-1 coordinates)
 * @param config Grid configuration
 * @returns Snapped position (in normalized 0-1 coordinates)
 */
export function snapToGrid(position: THREE.Vector2, config: GridConfig): THREE.Vector2 {
  // Convert from normalized coordinates to pixels
  const positionPx = new THREE.Vector2(position.x * config.gridSize.x, position.y * config.gridSize.y);

  // Adjust position relative to grid origin
  const adjustedPosition = new THREE.Vector2(positionPx.x - config.gridOrigin.x, positionPx.y - config.gridOrigin.y);

  // Snap to grid
  const snappedPosition =
    config.gridType === GridType.Square
      ? snapToSquareGrid(adjustedPosition, config.spacing)
      : snapToHexGrid(adjustedPosition, config.spacing);

  // Convert back to normalized coordinates
  return new THREE.Vector2(
    (snappedPosition.x + config.gridOrigin.x) / config.gridSize.x,
    (snappedPosition.y + config.gridOrigin.y) / config.gridSize.y
  );
}
