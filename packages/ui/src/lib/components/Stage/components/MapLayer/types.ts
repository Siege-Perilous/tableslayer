export enum MapLayerType {
  None = 0,
  FogOfWar = 1
}

/**
 * Props for the Map layer
 */
export interface MapLayerProps {
  /**
   * The position of the map relative to the scene
   */
  offset: {
    x: number;
    y: number;
  };

  /**
   * Rotation of the map relative to the scene
   */
  rotation: number;

  /**
   * Url for the map image
   */
  url: string;

  /**
   * The scale of the map relative to the scene
   */
  zoom: number;
}
