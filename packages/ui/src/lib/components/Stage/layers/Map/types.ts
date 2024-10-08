export enum ScaleMode {
  Custom = 0,
  Fill = 1,
  Fit = 2
}

/**
 * Props for the Map layer
 */
export type MapProps = {
  /**
   * Rotation of the map relative to the stage
   */
  rotation: number;

  /**
   * The position offset of the map in pixels
   */
  offset: {
    x: number;
    y: number;
  };

  /**
   * Setting controlling how the map should be scaled to fit the canvas
   */
  scaleMode: ScaleMode;

  /**
   * Controls the map scale factor when `scaleMode` is set to `ScaleMode.Custom`.
   */
  customScale: number;
};
