import {
  DrawMode,
  GridType,
  MapLayerType,
  PingEditMode,
  SceneRotation,
  ToolType,
  WeatherType,
  type StageProps
} from '@tableslayer/ui';
import { ToneMappingMode } from 'postprocessing';

export const StageDefaultProps: StageProps = {
  activeLayer: MapLayerType.None,
  debug: {
    enableStats: false,
    loggingRate: 30
  },
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
      size: 200,
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
  postProcessing: {
    enabled: true,
    bloom: {
      enabled: true,
      intensity: 0.5,
      threshold: 0.5,
      smoothing: 0.5,
      radius: 0.5,
      levels: 0.5,
      mipmapBlur: true
    },
    chromaticAberration: {
      enabled: true,
      offset: 0.001
    },
    toneMapping: {
      enabled: true,
      mode: ToneMappingMode.NEUTRAL
    },
    vignette: {
      enabled: true,
      offset: 0.5,
      darkness: 0.5
    }
  },
  scene: {
    offset: {
      x: 0,
      y: 0
    },
    rotation: SceneRotation.Deg0,
    zoom: 1.0
  },
  weather: {
    color: '#ffffff',
    fov: 50,
    intensity: 1,
    opacity: 0,
    type: WeatherType.Rain,
    custom: null
  }
};
