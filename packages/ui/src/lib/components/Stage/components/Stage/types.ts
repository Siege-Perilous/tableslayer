import type { FogOfWarLayerProps } from '../FogOfWarLayer/types';
import type { GridLayerProps } from '../GridLayer/types';
import type { MapLayerProps, MapLayerType } from '../MapLayer/types';
import type { PingLayerProps } from '../PingLayer/types';
import type { SceneLayerProps } from '../Scene/types';
import type { WeatherLayerProps } from '../WeatherLayer/types';

export interface Callbacks {
  onFogUpdate: (blob: Promise<Blob>) => void;
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

/**
 * Properties for post-processing effects
 */
export interface PostProcessingProps {
  /**
   * Bloom effect properties
   */
  bloom: {
    /**
     * Whether the bloom effect is enabled
     */
    enabled: boolean;

    /**
     * Overall intensity of the bloom effect (0-1)
     */
    intensity: number;

    /**
     * Luminance threshold for what pixels will bloom (0-1)
     */
    threshold: number;

    /**
     * How smoothly the bloom transitions at the threshold (0-1)
     */
    smoothing: number;

    /**
     * Radius of the bloom effect
     */
    radius: number;

    /**
     * Levels of the bloom effect
     */
    levels: number;

    /**
     * Whether to apply mipmap blur
     */
    mipmapBlur: boolean;
  };

  /**
   * Vignette effect properties
   */
  vignette: {
    /**
     * Whether the vignette effect is enabled
     */
    enabled: boolean;

    /**
     * How far from the center the vignette starts (0-1)
     */
    offset: number;

    /**
     * How dark the vignette effect is (0-1)
     */
    darkness: number;
  };
}

/**
 * Properties for the Stage component
 */
export type StageProps = {
  activeLayer: MapLayerType;
  backgroundColor: string;
  debug: {
    enableStats: boolean;
    loggingRate: number;
  };
  display: DisplayProps;
  fogOfWar: FogOfWarLayerProps;
  grid: GridLayerProps;
  map: MapLayerProps;
  ping: PingLayerProps;
  scene: SceneLayerProps;
  weather: WeatherLayerProps;
  postProcessing: PostProcessingProps;
};

export interface StageExports {
  fogOfWar: {
    clear: () => void;
    reset: () => void;
    toPng: () => Promise<Blob>;
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
