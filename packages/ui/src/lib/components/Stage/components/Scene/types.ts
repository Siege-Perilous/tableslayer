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
   * Rotation of the scene relative to the stage
   */
  rotation: number;

  /**
   * The position offset of the scenee in pixels
   */
  offset: {
    x: number;
    y: number;
  };

  /**
   * Setting controlling how the scene should be scaled to fit the canvas
   */
  scaleMode: ScaleMode;

  /**
   * Controls the scene scale factor when `scaleMode` is set to `ScaleMode.Custom`.
   */
  customScale: number;
};
