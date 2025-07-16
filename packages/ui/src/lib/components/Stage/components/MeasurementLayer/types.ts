import * as THREE from 'three';

export enum MeasurementType {
  Line = 1,
  Beam = 2,
  Cone = 3,
  Circle = 4,
  Square = 5
}

// Removed SnapType enum - using boolean instead

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
   * Whether to snap to grid
   */
  snapToGrid: boolean;

  /**
   * Enable DMG 252 diagonal movement rules (only applies when snapping to square grid)
   * First diagonal = 5ft, second = 10ft, alternating
   */
  enableDMG252: boolean;

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
}
