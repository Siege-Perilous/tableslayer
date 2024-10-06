import { GridType, type StageProps } from '@tableslayer/ui';

export const StageDefaultProps: StageProps = {
  backgroundColor: '#0b0b0c',
  camera: {
    zoom: 0.2,
    position: {
      x: 0,
      y: 0,
      z: 1
    }
  },
  map: {
    rotation: 0
  },
  grid: {
    gridType: GridType.Square,
    opacity: 1,
    spacing: 50,
    offset: { x: 0, y: 0 },
    lineColor: { r: 230, g: 230, b: 230 },
    lineThickness: 2,
    shadowIntensity: 1,
    shadowColor: { r: 0, g: 0, b: 0 },
    shadowSize: 2
  }
};
