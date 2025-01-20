export interface SceneLayerProps {
  /**
   * The position of the scene layer within the canvas
   */
  offset: { x: number; y: number };

  /**
   * The rotation of the scene layer in degrees
   */
  rotation: number;

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
    toPng: () => Promise<Blob>;
  };

  map: {
    fit: () => void;
    fill: () => void;
  };
}
