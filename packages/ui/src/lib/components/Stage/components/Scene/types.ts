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
  fill: () => void;
  fit: () => void;

  fogOfWar: {
    clear: () => void;
    reset: () => void;
    toJpeg: () => Promise<Blob>;
  };

  map: {
    fit: () => void;
    fill: () => void;
  };
}
