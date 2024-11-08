import { DrawMode, GridType, MapLayerType, ToolType, type StageProps } from '@tableslayer/ui';
import mapUrl from './dungeon.png';
import { fogOfWarData } from './fogOfWarData';

export const StageDefaultProps: StageProps = {
  backgroundColor: '#0b0b0c',
  fogOfWar: {
    data: fogOfWarData,
    fogColor: '#303030',
    opacity: 0.8,
    toolType: ToolType.RoundBrush,
    drawMode: DrawMode.Erase,
    brushSize: 200
  },
  grid: {
    gridType: GridType.Square,
    opacity: 0.2,
    divisions: { x: 20, y: 10 },
    offset: { x: 0, y: 0 },
    lineColor: { r: 230, g: 230, b: 230 },
    lineThickness: 1,
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
    zoom: 0.4,
    url: mapUrl
  },
  scene: {
    activeLayer: MapLayerType.None,
    resolution: { x: 1920, y: 1080 }
  },
  weather: {
    color: { r: 173, g: 227, b: 255 },
    angle: 20,
    opacity: 0.2,
    intensity: 0.5,
    speed: 10.0,
    scale: {
      x: 5.0,
      y: 100.0
    },
    weatherType: 0
  }
};
