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
    url: null,
    opacity: 1,
    outline: {
      color: '#000000',
      opacity: 1,
      thickness: 10
    },
    tool: {
      type: ToolType.Brush,
      size: 50,
      mode: DrawMode.Erase
    },
    edge: {
      minMipMapLevel: 0,
      maxMipMapLevel: 7,
      frequency: { x: 0.0005, y: 0.001, z: 0.0025, w: 0.005 },
      amplitude: { x: 0.6, y: 0.5, z: 0.5, w: 0.5 },
      offset: 0.8,
      speed: 0.2
    },
    noise: {
      baseColor: '#666666',
      fogColor1: '#888888',
      fogColor2: '#aaaaaa',
      fogColor3: '#cccccc',
      fogColor4: '#eeeeee',
      speed: { x: -0.015, y: 0.01, z: -0.05, w: 0.1 },
      frequency: { x: 0.0008, y: 0.002, z: 0.001, w: 0.001 },
      offset: { x: -0.4, y: -0.2, z: -0.3, w: -0.25 },
      amplitude: { x: 0.6, y: 0.5, z: 0.5, w: 1 },
      persistence: { x: 0.4, y: 0.4, z: 0.3, w: 0.48 },
      lacunarity: { x: 2.5, y: 2.5, z: 2.5, w: 2 },
      levels: { x: 6, y: 4, z: 3, w: 6 }
    }
  },
  grid: {
    gridType: GridType.Square,
    spacing: 1,
    opacity: 0.25,
    lineColor: '#000000',
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
    rotation: 0,
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
