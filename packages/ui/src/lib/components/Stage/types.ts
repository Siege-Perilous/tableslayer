import type { FogOfWarProps } from './layers/FogOfWar/types';
import type { GridProps } from './layers/Grid/types';
import type { MapProps } from './layers/Map/types';
import type { WeatherProps } from './layers/Weather/types';

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
   * Properties of the weather layer
   */
  weather: WeatherProps;
};
