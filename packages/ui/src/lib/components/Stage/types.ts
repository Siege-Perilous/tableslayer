import type { GridProps } from './layers/Grid/types';
import type { MapProps } from './layers/Map/types';

export type CameraProps = {
  zoom: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
};

export type SceneProps = {
  stageProps: StageProps;
  onCameraUpdate: (camera: CameraProps) => void;
};

/**
 * Properties for the Stage component
 */
export type StageProps = {
  /**
   * The background color represented as a hexadecimal string. If undefined, black is used as the default color.
   */
  backgroundColor: string;

  /**
   * Properities of the camera
   */
  camera: CameraProps;

  /**
   * Properties for the map layer
   */
  map: MapProps;

  /**
   * Properties for the grid layer
   */
  grid: GridProps;
};
