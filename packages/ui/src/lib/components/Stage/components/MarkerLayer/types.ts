export enum MarkerVisibility {
  Always = 0,
  DM = 1,
  Player = 2
}

export enum MarkerShape {
  None = 0,
  Circle = 1,
  Square = 2,
  Triangle = 3
}

export enum MarkerSize {
  Small = 1,
  Medium = 2,
  Large = 3
}

export interface Marker {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  size: MarkerSize;
  shape: MarkerShape;
  shapeColor: string;
  text: string | null;
  imageUrl: string | null;
  imageScale: number;
  visibility: MarkerVisibility;
}

export interface MarkerLayerProps {
  /**
   * Whether the marker layer is visible
   */
  visible: boolean;

  /**
   * The shape of the marker icons
   */
  shape: {
    /**
     * The stroke color of the marker icons represented as a hex string (e.g. 0x60A3FE)
     */
    strokeColor: string;

    /**
     * The stroke width of the marker icons
     */
    strokeWidth: number;
  };

  /**
   * The text of the marker
   */
  text: {
    /**
     * The size of the marker text
     */
    size: number;

    /**
     * The color of the marker text
     */
    color: string;

    /**
     * The stroke width of the marker text
     */
    strokeWidth: number;

    /**
     * The color of the marker text stroke
     */
    strokeColor: string;
  };

  /**
   * Whether to snap the marker to the grid
   */
  snapToGrid: boolean;

  /**
   * An array of Marker objects
   */
  markers: Marker[];
}
