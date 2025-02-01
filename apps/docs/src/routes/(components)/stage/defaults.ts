import {
  DrawMode,
  GridType,
  MapLayerType,
  ParticleType,
  PingEditMode,
  ToolType,
  type StageProps
} from '@tableslayer/ui';

export const StageDefaultProps: StageProps = {
  activeLayer: MapLayerType.None,
  backgroundColor: '#404040',
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
  scene: {
    offset: {
      x: 0,
      y: 0
    },
    rotation: 0,
    zoom: 1.0
  },
  weather: {
    camera: {
      position: { x: 0, y: 0, z: -500 },
      fov: 100,
      near: 1,
      far: 10000
    },
    particles: {
      count: 1000,
      type: ParticleType.Rain,
      lifetime: 5,
      spawnArea: { width: 1920, height: 1080 },
      initialVelocity: { x: 0, y: 0, z: 0 },
      force: {
        linear: { x: 0, y: 0, z: 0 },
        exponential: { x: 0, y: 0, z: 100 },
        sinusoidal: {
          amplitude: { x: 0, y: 0, z: 0 },
          frequency: { x: 5, y: 5, z: 5 }
        }
      },
      size: { min: 100, max: 100 },
      color: '#ffffff',
      opacity: 1,
      fadeInTime: 1.0,
      fadeOutTime: 1.0
    }
  }
};
