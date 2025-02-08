export enum SceneRotation {
  Deg0 = 0,
  Deg90 = 90,
  Deg180 = 180,
  Deg270 = 270
}

export enum SceneLayer {
  Main = 0,
  Overlay = 1,
  Input = 2
}

export interface SceneLayerProps {
  /**
   * The position of the scene layer within the canvas
   */
  offset: { x: number; y: number };

  /**
   * The rotation of the scene layer in degrees
   */
  rotation: SceneRotation;

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
