import type { FogOfWarLayerProps } from '../FogOfWarLayer/types';
import type { GridLayerProps } from '../GridLayer/types';
import type { MapLayerProps } from '../MapLayer/types';
import type { SceneLayerProps } from '../Scene/types';
import type { WeatherProps } from '../WeatherLayer/types';

/**
 * Properties for the Stage component
 */
export type StageProps = {
  /**
   * The background color represented as a hexadecimal string. If undefined, black is used as the default color.
   */
  backgroundColor: string;

  /**
   * Properties for the fog of war layer
   */
  fogOfWar: FogOfWarLayerProps;

  /**
   * Properties for the grid layer
   */
  grid: GridLayerProps;

  /**
   * Properties for the map layer
   */
  map: MapLayerProps;

  /**
   * Properties for the overall scene
   */
  scene: SceneLayerProps;

  /**
   * Properties of the weather layer
   */
  weather: WeatherProps;
};

export interface StageExports {
  fogOfWar: {
    clear: () => void;
    reset: () => void;
    toBase64: () => string;
  };
  map: {
    fit: () => void;
    fill: () => void;
    center: () => void;
  };
  scene: {
    fit: () => void;
    fill: () => void;
    center: () => void;
  };
}
