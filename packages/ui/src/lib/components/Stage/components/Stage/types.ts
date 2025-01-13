import type { FogOfWarLayerProps } from '../FogOfWarLayer/types';
import type { GridLayerProps } from '../GridLayer/types';
import type { MapLayerProps, MapLayerType } from '../MapLayer/types';
import type { PingLayerProps } from '../PingLayer/types';
import type { SceneLayerProps } from '../Scene/types';
import type { WeatherProps } from '../WeatherLayer/types';

export interface Callbacks {
  onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  onPingsUpdated: (updatedLocations: { x: number; y: number }[]) => void;
}

export interface DisplayProps {
  /**
   * The minimum padding around the grid relative to the edge of the scene.
   * The actual padding may be greater depending on the grid layout.
   */
  padding: {
    x: number;
    y: number;
  };

  /**
   * The size of the display in inches
   */
  size: { x: number; y: number };

  /**
   * The resolution of the display in pixels
   */
  resolution: { x: number; y: number };
}

export enum StageLayerZ {}

/**
 * Properties for the Stage component
 */
export type StageProps = {
  activeLayer: MapLayerType;
  backgroundColor: string;
  display: DisplayProps;
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
    toJpeg: () => Promise<Blob>;
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
