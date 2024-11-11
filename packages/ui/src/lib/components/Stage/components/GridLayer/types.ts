export enum GridType {
  Square = 0,
  Hex = 1
}

export interface GridLayerProps {
  /**
   * The type of grid. 0 for square, 1 for hex
   */
  gridType: GridType;

  /**
   * The opacity of the grid lines (0 to 1)
   */
  opacity: number;

  /**
   * The number of subdivisions along the x-axis of the scene
   */
  divisions: number;

  /**
   * Offset of the grid origin
   */
  offset: {
    x: number;
    y: number;
  };

  /**
   * Line thickness
   */
  lineThickness: number;

  /**
   * Line color
   */
  lineColor: { r: number; g: number; b: number };

  /**
   * Line thickness
   */
  shadowIntensity: number;

  /**
   * Line thickness
   */
  shadowSize: number;

  /**
   * Line color
   */
  shadowColor: { r: number; g: number; b: number };
}
