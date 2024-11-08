import type { MapLayerType } from '../MapLayer/types';

export interface SceneLayerProps {
  /**
   * The layer that is currently active for editing
   */
  activeLayer: MapLayerType;

  /**
   * The resolution of the display the scene is displayed on
   */
  resolution: { x: number; y: number };
}

export interface SceneExports {
  fillSceneToCanvas: () => void;
  fitSceneToCanvas: () => void;
  centerScene: () => void;

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
}
