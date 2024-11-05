import type { FogOfWarProps } from '../FogOfWarLayer/types';
import type { GridProps } from '../GridLayer/types';
import type { MapProps } from '../MapLayer/types';
import type { SceneProps } from '../Scene/types';
import type { WeatherProps } from '../WeatherLayer/types';

export interface StageFunctions {
  fogOfWar: {
    resetFog: () => void;
    revealAll: () => void;
    toBase64: () => string;
  };
}

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
  fogOfWar: FogOfWarProps;

  /**
   * Properties for the grid layer
   */
  grid: GridProps;

  /**
   * Properties for the map layer
   */
  map: MapProps;

  /**
   * Properties for the overall scene
   */
  scene: SceneProps;

  /**
   * Properties of the weather layer
   */
  weather: WeatherProps;
};
