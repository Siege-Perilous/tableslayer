import type { FogOfWarProps } from './layers/FogOfWar/types';
import type { GridProps } from './layers/Grid/types';
import type { MapProps } from './layers/Map/types';

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
};
