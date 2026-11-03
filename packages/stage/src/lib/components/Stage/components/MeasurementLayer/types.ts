import * as THREE from 'three';

export enum MeasurementType {
  Line = 1,
  Beam = 2,
  Cone = 3,
  Circle = 4,
  Square = 5
}

/**
 * How diagonal squares are counted on a snapped square grid.
 * '5e': every square, including diagonals, costs one grid unit (D&D 5E)
 * 'alternating': diagonals alternate between one and two grid units (D&D 3.5E, Pathfinder)
 */
export const DIAGONAL_RULES = ['5e', 'alternating'] as const;
export type DiagonalRule = (typeof DIAGONAL_RULES)[number];

export interface Measurement {
  id: string;
  type: MeasurementType;
  startPoint: THREE.Vector2;
  endPoint: THREE.Vector2;
  distance: number;
  unit: string;
  createdAt: number;
}

export interface MeasurementLayerProps {
  /**
   * The type of measurement to display
   */
  type: MeasurementType;

  /**
   * Whether to snap to grid cell centers. Snapped square grids count squares
   * using the diagonal rule
   */
  snapToGrid: boolean;

  /**
   * How diagonals are counted on a snapped square grid
   */
  diagonalRule: DiagonalRule;

  /**
   * Internal: converts the label's display-pixel sizing into local pixels when
   * the layer is anchored to the map (set by MeasurementManager; leave unset)
   */
  textScale?: number;

  /**
   * Auto-hide delay in milliseconds (default 3000ms)
   */
  autoHideDelay: number;

  /**
   * Color of the measurement line
   */
  color: string;

  /**
   * Thickness of the measurement line
   */
  thickness: number;

  /**
   * Diameter of the measurement markers/points
   */
  markerSize: number;

  /**
   * Opacity of the measurement
   */
  opacity: number;

  /**
   * Whether to show distance text
   */
  showDistance: boolean;

  /**
   * Thickness of the text outline
   */
  outlineThickness: number;

  /**
   * Color of the text outline
   */
  outlineColor: string;

  /**
   * Width of beam measurements in world grid units
   */
  beamWidth: number;

  /**
   * Angle of cone measurements in degrees
   */
  coneAngle: number;

  /**
   * Fadeout animation duration in milliseconds (default 500ms)
   */
  fadeoutTime: number;
}
