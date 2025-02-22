import type { EdgeOverlayProps } from '../EdgeOverlayLayer/types';
import type { FogLayerProps } from '../FogLayer/types';
import type { FogOfWarLayerProps } from '../FogOfWarLayer/types';
import type { GridLayerProps } from '../GridLayer/types';
import type { MapLayerProps, MapLayerType } from '../MapLayer/types';
import type { Marker, MarkerLayerProps } from '../MarkerLayer/types';
import type { PostProcessingProps, SceneLayerProps } from '../Scene/types';
import type { WeatherLayerProps } from '../WeatherLayer/types';

export interface Callbacks {
  onFogUpdate: (blob: Promise<Blob>) => void;
  onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  onMarkersUpdated: (updatedMarkers: Marker[]) => void;
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
  fog: FogLayerProps;
  edgeOverlay: EdgeOverlayProps;
  fogOfWar: FogOfWarLayerProps;
  grid: GridLayerProps;
  map: MapLayerProps;
  marker: MarkerLayerProps;
  postProcessing: PostProcessingProps;
  scene: SceneLayerProps;
  weather: WeatherLayerProps;
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
