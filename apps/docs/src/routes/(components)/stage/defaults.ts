import {
  DrawMode,
  GridType,
  MapLayerType,
  PingEditMode,
  ToolType,
  WeatherType,
  type StageProps
} from '@tableslayer/ui';
import { ToneMappingMode } from 'postprocessing';

export const StageDefaultProps: StageProps = {
  activeLayer: MapLayerType.None,
  backgroundColor: '#404040',
  debug: {
    enableStats: true,
    loggingRate: 30
  },
  display: {
    padding: { x: 16, y: 16 },
    size: { x: 17.77, y: 10.0 },
    resolution: { x: 1920, y: 1080 }
  },
  fog: {
    color: '#ffffff',
    opacity: 0.5,
    speed: 0.2,
    persistence: 0.8,
    lacunarity: 2.0,
    frequency: 5,
    amplitude: 0.7,
    offset: 0.3,
    levels: 10
  },
  fogOfWar: {
    url: null,
    opacity: 1.0,
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
      baseColor: '#000000',
      fogColor1: '#888888',
      fogColor2: '#aaaaaa',
      fogColor3: '#cccccc',
      fogColor4: '#808080',
      speed: { x: -0.015, y: 0.01, z: -0.05, w: 0.1 },
      frequency: { x: 0.0008, y: 0.002, z: 0.001, w: 0.001 },
      offset: { x: -0.4, y: -0.2, z: -0.3, w: -0.25 },
      amplitude: { x: 0.0, y: 0.0, z: 0.0, w: 0.8 },
      persistence: { x: 0.4, y: 0.4, z: 0.3, w: 0.48 },
      lacunarity: { x: 2.5, y: 2.5, z: 2.5, w: 2 },
      levels: { x: 6, y: 4, z: 3, w: 6 }
    }
  },
  grid: {
    gridType: GridType.Square,
    spacing: 1,
    opacity: 0.25,
    lineColor: '#ffffff',
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
      intensity: 0.6,
      threshold: 0.5,
      smoothing: 0.3,
      radius: 0.5,
      levels: 10,
      mipmapBlur: true
    },
    chromaticAberration: {
      enabled: true,
      offset: 0.003
    },
    depthOfField: {
      enabled: true,
      focus: 0.98,
      focalLength: 0.15,
      bokehScale: 25.0
    },
    lut: {
      enabled: true,
      url: 'https://files.tableslayer.com/stage/luts/Warm.cube'
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
    rotation: 0,
    zoom: 1.0
  },
  weather: {
    fov: 60,
    intensity: 0.5,
    opacity: 0.75,
    type: WeatherType.Rain,
    custom: {
      count: 1740,
      type: 2,
      color: '#42d8d3',
      opacity: 0.35,
      fadeInTime: 0.36999999999999994,
      fadeOutTime: 0.36999999999999994,
      lifetime: 1.5869565217391304,
      spawnArea: {
        minRadius: 0.05859375,
        maxRadius: 0.6020720108695652
      },
      initialVelocity: {
        x: 0,
        y: 0,
        z: 0
      },
      force: {
        linear: {
          x: 0,
          y: 0,
          z: 1
        },
        exponential: {
          x: 0,
          y: 0,
          z: 0
        },
        sinusoidal: {
          amplitude: {
            x: 0,
            y: 0,
            z: 0
          },
          frequency: {
            x: 5,
            y: 5,
            z: 5
          }
        }
      },
      rotation: {
        alignRadially: false,
        offset: 0,
        velocity: 0,
        randomize: true
      },
      scale: {
        x: 1,
        y: 2.717391304347826
      },
      size: {
        min: 0.007456521739130435,
        max: 0.018217391304347828
      }
    }
  }
};
