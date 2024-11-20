export enum PingEditMode {
  Add = 0,
  Remove = 1
}

export interface PingLayerProps {
  /**
   * Color of the ping icons represented as a hex string (e.g. 0x60A3FE)
   */
  color: string;

  /**
   * The current edit mode for the ping layer (add or remove pings)
   */
  editMode: PingEditMode;

  /**
   * An array of the locations of all ping markers. Values for `x` and `y`
   * should vary between 0 and 1. The origin is the bottom-left of the map.
   */
  locations: { x: number; y: number }[];

  /**
   * The size of the ping marker
   */
  markerSize: number;

  /**
   * The opacity of the ping layer
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
   * The outer radius of the ping marker
   */
  thickness: number;
}
