import { GridType, ScaleMode, type StageProps } from '@tableslayer/ui';

export const StageDefaultProps: StageProps = {
  backgroundColor: '#0b0b0c',
  fogOfWar: {
    fogColor: { r: 50, g: 50, b: 50 }
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
  },
  map: {
    rotation: 0,
    offset: {
      x: 0,
      y: 0
    },
    scaleMode: ScaleMode.Custom,
    customScale: 0.2
  }
};
