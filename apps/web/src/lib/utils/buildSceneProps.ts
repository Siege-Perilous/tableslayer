import { type SelectScene } from '$lib/db/gs/schema';
import { DrawMode, type GridType, MapLayerType, PingEditMode, type StageProps, ToolType } from '@tableslayer/ui';

// Map activeScene properties to StageProps
export const buildSceneProps = (activeScene: SelectScene): StageProps => {
  return {
    activeLayer: MapLayerType.None,
    backgroundColor: activeScene.backgroundColor,
    display: {
      padding: {
        x: activeScene.displayPaddingX,
        y: activeScene.displayPaddingY
      },
      size: {
        x: activeScene.displaySizeX,
        y: activeScene.displaySizeY
      },
      resolution: {
        x: activeScene.displayResolutionX,
        y: activeScene.displayResolutionY
      }
    },
    fogOfWar: {
      data: activeScene.fogOfWarData,
      opacity: activeScene.fogOfWarOpacity,
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
        baseColor: activeScene.fogOfWarColor,
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
      gridType: activeScene.gridType as GridType,
      spacing: activeScene.gridSpacing,
      opacity: activeScene.gridOpacity,
      lineColor: activeScene.gridLineColor,
      lineThickness: activeScene.gridLineThickness,
      shadowColor: activeScene.gridShadowColor,
      shadowOpacity: activeScene.gridShadowOpacity,
      shadowBlur: activeScene.gridShadowBlur,
      shadowSpread: activeScene.gridShadowSpread
    },
    map: {
      rotation: activeScene.mapRotation,
      offset: {
        x: activeScene.mapOffsetX,
        y: activeScene.mapOffsetY
      },
      zoom: activeScene.mapZoom,
      url: activeScene.mapLocation || 'https://files.tableslayer.com/maps/01.jpeg'
    },
    scene: {
      offset: {
        x: activeScene.sceneOffsetX,
        y: activeScene.sceneOffsetY
      },
      zoom: 1
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
    weather: {
      color: '#AD0000',
      angle: 20,
      opacity: 0.9,
      intensity: 0.5,
      speed: 10.0,
      scale: {
        x: 5.0,
        y: 100.0
      },
      weatherType: 0
    }
  };
};
