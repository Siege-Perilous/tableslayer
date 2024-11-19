import type { FogOfWarLayerProps } from '../FogOfWarLayer/types';
import type { GridLayerProps } from '../GridLayer/types';
import type { MapLayerProps } from '../MapLayer/types';
import type { PingLayerProps } from '../PingLayer/types';
import type { SceneLayerProps } from '../Scene/types';
import type { WeatherProps } from '../WeatherLayer/types';

/**
 * Properties for the Stage component
 */
export type StageProps = {
  backgroundColor: string;
  fogOfWar: FogOfWarLayerProps;
  grid: GridLayerProps;
  map: MapLayerProps;
  ping: PingLayerProps;
  scene: SceneLayerProps;
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
  };
  scene: {
    fit: () => void;
    fill: () => void;
  };
}
