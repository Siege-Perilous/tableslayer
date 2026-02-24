import * as THREE from 'three';
import { type GridLayerProps } from '../components/GridLayer/types';
import type { DisplayProps } from '../components/Stage/types';
/**
 * Gets the size of a grid cell in pixels
 * @param gridType Type of grid (square or hex)
 * @param gridSizePixels Base grid size in pixels
 * @returns Width of grid cell in pixels
 */
export declare function getGridCellSize(grid: GridLayerProps, display: DisplayProps): number;
/**
 * Calculates the grid origin for Map defined mode
 * Matches the shader logic for grid positioning
 * @param grid Grid configuration
 * @param display Display properties
 * @returns Grid origin in pixels (from top-left corner)
 */
export declare function getGridOrigin(grid: GridLayerProps, display: DisplayProps): THREE.Vector2;
/**
 * Snaps a position to the nearest grid intersection based on the current grid configuration
 * @param position Position to snap (in screen coordinates, relative to center)
 * @param grid Grid configuration
 * @param display Display properties
 * @param centerOnly For hex grids, whether to snap to centers only (used for measurements)
 * @returns Snapped position (in screen coordinates, relative to center)
 */
export declare function snapToGrid(position: THREE.Vector2, grid: GridLayerProps, display: DisplayProps, centerOnly?: boolean): THREE.Vector2;
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
 * Converts pixel coordinates to hex grid coordinates
 * Returns the grid indices of the hex containing the point
 * @param point Position in pixel coordinates
 * @param spacing Grid spacing in pixels
 * @returns Hex grid coordinates (indices and grid type)
 */
export declare function pixelToHex(point: THREE.Vector2, spacing: number): HexCoordinate & {
    isGrid2?: boolean;
};
/**
 * Converts hex grid coordinates to pixel coordinates
 * For flat-topped hexagons in offset coordinate system
 * @param hex Hex grid coordinates in offset format
 * @param spacing Grid spacing in pixels (width of hex)
 * @returns Position in pixel coordinates
 */
export declare function hexToPixel(hex: HexCoordinate, spacing: number): THREE.Vector2;
/**
 * Calculates the hex distance between two hex positions
 * Returns 1 for adjacent hexes, 2 for hexes with one between them, etc.
 * @param hex1 First hex coordinate (with isGrid2 flag)
 * @param hex2 Second hex coordinate (with isGrid2 flag)
 * @returns Number of hexes in the shortest path
 */
export declare function hexDistance(hex1: HexCoordinate & {
    isGrid2?: boolean;
}, hex2: HexCoordinate & {
    isGrid2?: boolean;
}): number;
