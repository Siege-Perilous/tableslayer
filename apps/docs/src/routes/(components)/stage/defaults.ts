import { DrawMode, GridType, MapLayerType, PingEditMode, ToolType, type StageProps } from '@tableslayer/ui';
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
    divisions: 20,
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
    zoom: 1.0,
    url: mapUrl
  },
  ping: {
    color: { r: 20, g: 200, b: 255 },
    editMode: PingEditMode.Add,
    locations: [
      { x: 0.16162790697674412, y: 0.2954545454545454 },
      { x: 0.46976744186046515, y: 0.5742424242424242 },
      { x: 0.616279069767442, y: 0.23939393939393938 }
    ],
    markerSize: 70,
    opacity: 1.0,
    pulseAmplitude: 0.2,
    pulseSpeed: 3.0,
    sharpness: 0.95,
    thickness: 0.1
  },
  scene: {
    activeLayer: MapLayerType.None,
    offset: {
      x: 0,
      y: 0
    },
    resolution: { x: 1920, y: 1080 },
    zoom: 0.4
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
