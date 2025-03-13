import { type SelectMarker, type SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import { generateGradientColors } from '$lib/utils';
import { hasThumb } from '$lib/utils/hasThumb';
import {
  DrawMode,
  type GridType,
  MapLayerType,
  type Marker,
  RainPreset,
  SceneRotation,
  StageMode,
  type StageProps,
  ToolType
} from '@tableslayer/ui';

// Map activeScene properties to StageProps
export const buildSceneProps = (
  activeScene: SelectScene | (SelectScene & Thumb),
  activeSceneMarkers: (SelectMarker & Partial<Thumb>)[],
  mode: 'client' | 'editor'
): StageProps => {
  const fogColors = generateGradientColors(activeScene.fogOfWarColor);
  const thumbUrl =
    hasThumb(activeScene) && activeScene.thumb !== null ? `${activeScene.thumb.resizedUrl}?t=${Date.now()}` : '';

  let markers: Marker[] = [];
  if (activeSceneMarkers && Array.isArray(activeSceneMarkers)) {
    markers = activeSceneMarkers.map((marker) => ({
      id: marker.id,
      title: marker.title,
      position: { x: marker.positionX, y: marker.positionY },
      size: marker.size,
      shape: marker.shape,
      shapeColor: marker.shapeColor,
      label: marker.label,
      imageUrl: marker.imageLocation && marker.thumb?.resizedUrl ? `${marker.thumb.resizedUrl}?t=${Date.now()}` : null,
      imageScale: marker.imageScale,
      visibility: marker.visibility,
      note: marker.note
    }));
  }

  return {
    mode: StageMode.DM,
    activeLayer: MapLayerType.None,
    backgroundColor: activeScene.backgroundColor,
    debug: {
      enableStats: false,
      loggingRate: 30
    },
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
    edgeOverlay: {
      enabled: activeScene.edgeEnabled,
      url: activeScene.edgeUrl,
      opacity: activeScene.edgeOpacity,
      scale: activeScene.edgeScale,
      fadeStart: activeScene.edgeFadeStart,
      fadeEnd: activeScene.edgeFadeEnd
    },
    fog: {
      enabled: activeScene.fogEnabled,
      color: activeScene.fogColor,
      opacity: activeScene.fogOpacity,
      speed: 0.05,
      persistence: 0.5,
      lacunarity: 2.5,
      frequency: 1.5,
      amplitude: 1.5,
      offset: -0.5,
      levels: 4
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
    marker: {
      visible: true,
      snapToGrid: true,
      shape: {
        strokeColor: activeScene.markerStrokeColor,
        strokeWidth: activeScene.markerStrokeWidth,
        shadowColor: '#000000',
        shadowBlur: 120,
        shadowOffset: {
          x: 0,
          y: 0
        }
      },
      text: {
        color: activeScene.markerTextColor,
        strokeColor: activeScene.markerTextStrokeColor,
        size: 300,
        strokeWidth: 1
      },
      markers: markers
    },
    postProcessing: {
      enabled: true,
      bloom: {
        enabled: true,
        intensity: activeScene.effectsBloomIntensity,
        threshold: activeScene.effectsBloomThreshold,
        smoothing: activeScene.effectsBloomSmoothing,
        radius: activeScene.effectsBloomRadius,
        levels: activeScene.effectsBloomLevels,
        mipmapBlur: activeScene.effectsBloomMipMapBlur
      },
      chromaticAberration: {
        enabled: true,
        offset: activeScene.effectsChromaticAberrationOffset
      },
      lut: {
        enabled: true,
        url: activeScene.effectsLutUrl
      },
      toneMapping: {
        enabled: true,
        mode: activeScene.effectsToneMappingMode
      },
      vignette: {
        enabled: false,
        offset: 0.5,
        darkness: 0.5
      }
    },
    scene: {
      offset: {
        x: activeScene.sceneOffsetX,
        y: activeScene.sceneOffsetY
      },
      rotation: mode === 'editor' ? activeScene.sceneRotation : SceneRotation.Deg0,
      zoom: 1
    },
    weather: {
      type: activeScene.weatherType,
      opacity: activeScene.weatherOpacity,
      intensity: activeScene.weatherIntensity,
      fov: activeScene.weatherFov,
      custom: { ...RainPreset }
    }
  };
};
