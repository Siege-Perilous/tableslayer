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
  centerMap: () => void;
  fillMapToScreen: () => void;
  fitMapToScreen: () => void;
  resetFog: () => void;
  clearFog: () => void;
  exportFogToBase64: () => string;
}
