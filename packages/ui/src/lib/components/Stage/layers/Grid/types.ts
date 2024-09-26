export type GridProps = {
  /**
   * The type of grid. 0 for square, 1 for hex
   */
  gridType: { value: number };

  /**
   * The opacity of the grid lines (0 to 1)
   */
  opacity: { value: number };

  /**
   * The grid spacing
   */
  spacing: { value: number };

  /**
   * Offset of the grid origin
   */
  offset: {
    value: {
      x: number;
      y: number;
    };
  };

  /**
   * Line thickness
   */
  lineThickness: { value: number };

  /**
   * Line color
   */
  lineColor: { value: { r: number; g: number; b: number } };

  /**
   * Line thickness
   */
  shadowIntensity: { value: number };

  /**
   * Line thickness
   */
  shadowSize: { value: number };

  /**
   * Line color
   */
  shadowColor: { value: { r: number; g: number; b: number } };
};

export enum GridType {
  Square = 0,
  Hex = 1
}
