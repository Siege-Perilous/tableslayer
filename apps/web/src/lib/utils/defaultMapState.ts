import { DrawMode, GridType, MapLayerType, PingEditMode, ToolType, type StageProps } from '@tableslayer/ui';

export const StageDefaultProps: StageProps = {
  backgroundColor: '#0b0b0c',
  fogOfWar: {
    data: null,
    fogColor: '#000',
    opacity: 0.5,
    toolType: ToolType.RoundBrush,
    drawMode: DrawMode.Erase,
    brushSize: 200
  },
  grid: {
    gridType: GridType.Square,
    opacity: 0.2,
    divisions: 20,
    offset: { x: 0, y: 0 },
    lineColor: '#E6E6E6',
    lineThickness: 1,
    shadowIntensity: 1,
    shadowColor: '#000000',
    shadowSize: 2
  },
  map: {
    rotation: 0,
    offset: {
      x: 0,
      y: 0
    },
    zoom: 0.4,
    url: 'https://files.tableslayer.com/maps/01.jpeg'
  },
  ping: {
    color: '#ff0000',
    editMode: PingEditMode.Add,
    locations: [],
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
    color: '#ADE3FF',
    angle: 20,
    opacity: 0.2,
    intensity: 0.4,
    speed: 5.0,
    scale: {
      x: 5.0,
      y: 100.0
    },
    weatherType: 0
  }
};
