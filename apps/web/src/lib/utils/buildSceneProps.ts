import { type SelectScene } from '$lib/db/gs/schema';
import type { Thumb } from '$lib/server';
import { generateGradientColors } from '$lib/utils';
import { hasThumb } from '$lib/utils/hasThumb';
import { DrawMode, type GridType, MapLayerType, PingEditMode, type StageProps, ToolType } from '@tableslayer/ui';

// Map activeScene properties to StageProps
export const buildSceneProps = (activeScene: SelectScene | (SelectScene & Thumb)): StageProps => {
  const fogColors = generateGradientColors(activeScene.fogOfWarColor);
  const thumbUrl = hasThumb(activeScene) && activeScene.thumb !== null ? activeScene.thumb.resizedUrl : '';
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
      url: activeScene.fogOfWarUrl,
      opacity: activeScene.fogOfWarOpacity,
      outline: {
        color: '#FFFFFF',
        opacity: 1,
        thickness: 2
      },
      tool: {
        type: ToolType.Brush,
        size: 75,
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
        baseColor: fogColors[0],
        fogColor1: fogColors[1],
        fogColor2: fogColors[2],
        fogColor3: fogColors[3],
        fogColor4: fogColors[4],
        speed: { x: -0.015, y: 0.03, z: -0.05, w: 0.1 },
        frequency: { x: 0.0008, y: 0.002, z: 0.001, w: 0.001 },
        offset: { x: -0.4, y: -0.2, z: -0.3, w: -0.25 },
        amplitude: { x: -2.0, y: 0.5, z: 0.5, w: 1 },
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
      shadowOpacity: 0,
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
      url: thumbUrl
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
      opacity: 0,
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
