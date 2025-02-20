export enum MarkerEditMode {
  Add = 0,
  Remove = 1
}

export interface MarkerLayerProps {
  /**
   * Color of the marker icons represented as a hex string (e.g. 0x60A3FE)
   */
  color: string;

  /**
   * The current edit mode for the marker layer (add or remove markers)
   */
  editMode: MarkerEditMode;

  /**
   * An array of the locations of all marker markers. Values for `x` and `y`
   * should vary between 0 and 1. The origin is the bottom-left of the map.
   */
  locations: { x: number; y: number }[];

  /**
   * The size of the marker marker
   */
  markerSize: number;

  /**
   * The opacity of the marker layer
   */
  opacity: number;

  /**
   * The amplitude of the pulsing animation
   */
  pulseAmplitude: number;

  /**
   * The speed of the pulsing effect
   */
  pulseSpeed: number;

  /**
   * The sharpness of the edge of the marker
   */
  sharpness: number;

  /**
   * The outer radius of the marker marker
   */
  thickness: number;
}
