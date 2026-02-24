import * as THREE from 'three';
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
export declare function calculateHexGridDistance(startPoint: THREE.Vector2, endPoint: THREE.Vector2, gridSpacing: number, displaySize: {
    x: number;
    y: number;
}, displayResolution: {
    x: number;
    y: number;
}, worldGridSize?: number, returnHexCount?: boolean): number;
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
export declare function calculateLineDistance(startPoint: THREE.Vector2, endPoint: THREE.Vector2, gridSpacing: number, displaySize: {
    x: number;
    y: number;
}, displayResolution: {
    x: number;
    y: number;
}, gridType?: GridType, snapToGrid?: boolean, enableDMG252?: boolean, worldGridSize?: number, _worldGridUnits?: string): number;
/**
 * Calculate D&D diagonal movement distance
 * In D&D, diagonal movement costs 1.5 times normal movement
 * This is implemented as: max(dx, dy) + min(dx, dy) * 0.5
 */
export declare function calculateDnDDiagonalDistance(startPoint: THREE.Vector2, endPoint: THREE.Vector2): number;
/**
 * Calculate distance using DMG 252 diagonal movement rules
 * First diagonal = 1 grid unit, second = 2 grid units, alternating
 * Only applies when snapping to square grid
 */
export declare function calculateDMG252Distance(startPoint: THREE.Vector2, endPoint: THREE.Vector2): number;
/**
 * Calculate radius from center point to edge point
 */
export declare function calculateRadius(centerPoint: THREE.Vector2, edgePoint: THREE.Vector2): number;
/**
 * Calculate area of a circle
 */
export declare function calculateCircleArea(radius: number): number;
/**
 * Calculate area of a square
 */
export declare function calculateSquareArea(sideLength: number): number;
/**
 * Convert pixels to game units (assuming 1 inch = 1 unit)
 * This is a placeholder - actual conversion depends on grid scale
 */
export declare function pixelsToUnits(pixels: number, pixelsPerUnit?: number): number;
/**
 * Convert game units to pixels
 */
export declare function unitsToPixels(units: number, pixelsPerUnit?: number): number;
