import type { MapLayerType } from '../MapLayer/types';

export enum ScaleMode {
  Custom = 0,
  Fill = 1,
  Fit = 2
}

/**
 * Props for the Map layer
 */
export type SceneProps = {
  /**
   * The layer that is currently active for editing
   */
  activeLayer: MapLayerType;

  /**
   * Maximum zoom level
   */
  maxZoom: number;

  /**
   * Minimum zoom level
   */
  minZoom: number;

  /**
   * The position offset of the scenee in pixels
   */
  offset: {
    x: number;
    y: number;
  };

  /**
   * Rotation of the scene relative to the stage
   */
  rotation: number;

  /**
   * Setting controlling how the scene should be scaled to fit the canvas
   */
  scaleMode: ScaleMode;

  /**
   * Controls the zoom factor when `scaleMode` is set to `ScaleMode.Custom`.
   */
  zoom: number;

  /**
   * Sensitivity factor for scroll-to-zoom behavior
   */
  zoomSensitivity: number;
};
