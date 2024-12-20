import { DrawMode, GridType, MapLayerType, PingEditMode, ToolType, type StageProps } from '@tableslayer/ui';

export const StageDefaultProps: StageProps = {
  activeLayer: MapLayerType.None,
  backgroundColor: '#0b0b0c',
  display: {
    padding: { x: 16, y: 16 },
    size: { x: 17.77, y: 10.0 },
    resolution: { x: 1920, y: 1080 }
  },
  fogOfWar: {
    data: null,
    fogColor: '#00ff00',
    opacity: 0.8,
    toolType: ToolType.Brush,
    drawMode: DrawMode.Erase,
    brushSize: 200
  },
  grid: {
    gridType: GridType.Square,
    spacing: 1,
    opacity: 0.05,
    lineColor: '#E6E6E6',
    lineThickness: 1.0,
    shadowOpacity: 0.4,
    shadowBlur: 0.5,
    shadowColor: '#000000',
    shadowSpread: 2
  },
  map: {
    rotation: 0,
    offset: {
      x: 0,
      y: 0
    },
    zoom: 1.0,
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
    offset: {
      x: 0,
      y: 0
    },
    zoom: 1.0
  },
  weather: {
    color: '#a0a0f0',
    angle: 20,
    opacity: 0.7,
    intensity: 0.3,
    speed: 10.0,
    scale: {
      x: 5.0,
      y: 100.0
    },
    weatherType: 0
  }
};
