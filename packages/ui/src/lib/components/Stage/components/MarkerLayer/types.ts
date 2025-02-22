export enum MarkerEditMode {
  Add = 0,
  Remove = 1
}

export interface Marker {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
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

  /**
   * An array of Marker objects
   */
  markers: Marker[];
}
