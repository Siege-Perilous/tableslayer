import { type SelectScene } from '$lib/db/gs/schema';
import type { Thumb } from '$lib/server';
import { hasThumb } from '$lib/utils/hasThumb';
import { DrawMode, type GridType, MapLayerType, PingEditMode, type StageProps, ToolType } from '@tableslayer/ui';

// Map activeScene properties to StageProps
export const buildSceneProps = (activeScene: SelectScene | (SelectScene & Thumb)): StageProps => {
  const thumbUrl = hasThumb(activeScene) ? activeScene.thumb.resizedUrl : 'https://files.tableslayer.com/maps/01.jpeg';
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
      fogColor: activeScene.fogOfWarColor,
      opacity: activeScene.fogOfWarOpacity,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Erase,
      brushSize: 200
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
