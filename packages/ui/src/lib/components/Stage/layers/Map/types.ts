/**
 * Props for the Map layer
 */
export type MapProps = {
  /**
   * Rotation of the map relative to the stage
   */
  rotation: number;

  /**
   * The scale/zoom of the map. Default is 1.0
   */
  scale: number;

  /**
   * The position offset of the map in pixels
   */
  offset: {
    x: number;
    y: number;
  };
};
