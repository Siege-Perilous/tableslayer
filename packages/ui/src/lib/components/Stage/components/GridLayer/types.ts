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
   * The grid spacing in inches
   */
  spacing: number;

  /**
   * Line thickness
   */
  lineThickness: number;

  /**
   * Line color represented as a hex string (e.g. 0x60A3FE)
   */
  lineColor: string;

  /**
   * Opacity of the drop shadow
   */
  shadowOpacity: number;

  /**
   * Blur factor for the drop shadow
   */
  shadowBlur: number;

  /**
   * Spread amount for the drop shadow
   */
  shadowSpread: number;

  /**
   * Shadow represented as a hex string (e.g. 0x60A3FE)
   */
  shadowColor: string;
}
