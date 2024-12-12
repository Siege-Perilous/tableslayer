export interface SceneLayerProps {
  /**
   * The position of the scene layer within the canvas
   */
  offset: { x: number; y: number };

  /**
   * The scale of the scene layer
   */
  zoom: number;
}

export interface SceneExports {
  fillSceneToCanvas: () => void;
  fitSceneToCanvas: () => void;

  fogOfWar: {
    clear: () => void;
    reset: () => void;
    toBase64: () => string;
  };

  map: {
    fit: () => void;
    fill: () => void;
  };
}
