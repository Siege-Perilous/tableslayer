import { type SelectMarker, type SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import { generateGradientColors } from '$lib/utils';
import { StageDefaultProps } from '$lib/utils/defaultMapState';
import { generateLargeImageUrl, generateSquareThumbnailUrl, isDefaultMap } from '$lib/utils/generateR2Url';
import {
  DrawMode,
  GridType,
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
  const fogColors = generateGradientColors(activeScene.fogOfWarColor || '#000000');

  // Build the map URL - always construct R2 transformation URL from mapLocation
  console.log('[buildSceneProps] Building map URL for scene:', {
    sceneId: activeScene.id,
    mapLocation: activeScene.mapLocation,
    isDefault: isDefaultMap(activeScene.mapLocation),
    hasMapLocation: !!activeScene.mapLocation
  });

  const thumbUrl =
    !isDefaultMap(activeScene.mapLocation) && activeScene.mapLocation
      ? generateLargeImageUrl(activeScene.mapLocation)
      : StageDefaultProps.map.url;

  console.log('[buildSceneProps] Generated map URL:', {
    sceneId: activeScene.id,
    resultUrl: thumbUrl,
    usedDefault: thumbUrl === StageDefaultProps.map.url
  });

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
      imageUrl: marker.imageLocation ? generateSquareThumbnailUrl(marker.imageLocation) : null,
      imageScale: 1,
      visibility: marker.visibility,
      note: marker.note || null
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
        x: activeScene.displayPaddingX ?? 0,
        y: activeScene.displayPaddingY ?? 0
      },
      size: {
        x: activeScene.displaySizeX ?? 1920,
        y: activeScene.displaySizeY ?? 1080
      },
      resolution: {
        x: activeScene.displayResolutionX ?? 1920,
        y: activeScene.displayResolutionY ?? 1080
      }
    },
    edgeOverlay: {
      enabled: activeScene.edgeEnabled ?? false,
      url: activeScene.edgeUrl ?? '',
      opacity: activeScene.edgeOpacity ?? 1,
      scale: activeScene.edgeScale ?? 1,
      fadeStart: activeScene.edgeFadeStart ?? 0,
      fadeEnd: activeScene.edgeFadeEnd ?? 1
    },
    fog: {
      enabled: activeScene.fogEnabled ?? false,
      color: activeScene.fogColor ?? '#ffffff',
      opacity: activeScene.fogOpacity ?? 1,
      speed: 0.05,
      persistence: 0.5,
      lacunarity: 2.5,
      frequency: 1.5,
      amplitude: 1.5,
      offset: -0.5,
      levels: 4
    },
    fogOfWar: {
      url: activeScene.fogOfWarUrl ?? '',
      opacity: activeScene.fogOfWarOpacity ?? 1,
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
      gridType: (activeScene.gridType as GridType) ?? GridType.Square,
      spacing: activeScene.gridSpacing ?? 50,
      opacity: activeScene.gridOpacity ?? 0.5,
      lineColor: activeScene.gridLineColor ?? '#ffffff',
      lineThickness: activeScene.gridLineThickness ?? 1,
      shadowColor: activeScene.gridShadowColor ?? '#000000',
      shadowOpacity: 0,
      shadowBlur: activeScene.gridShadowBlur ?? 0,
      shadowSpread: activeScene.gridShadowSpread ?? 0
    },
    map: {
      rotation: activeScene.mapRotation ?? 0,
      offset: {
        x: activeScene.mapOffsetX ?? 0,
        y: activeScene.mapOffsetY ?? 0
      },
      zoom: activeScene.mapZoom ?? 1,
      url: thumbUrl // Empty string if no thumbnail exists - Stage component handles fallback
    },
    marker: {
      visible: true,
      snapToGrid: true,
      shape: {
        strokeColor: activeScene.markerStrokeColor ?? '#ffffff',
        strokeWidth: activeScene.markerStrokeWidth ?? 2,
        shadowColor: '#000000',
        shadowBlur: 120,
        shadowOffset: {
          x: 0,
          y: 0
        }
      },
      text: {
        color: activeScene.markerTextColor ?? '#ffffff',
        strokeColor: activeScene.markerTextStrokeColor ?? '#000000',
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
      autoFit: true,
      offset: {
        x: activeScene.sceneOffsetX ?? 0,
        y: activeScene.sceneOffsetY ?? 0
      },
      rotation: mode === 'editor' ? (activeScene.sceneRotation ?? SceneRotation.Deg0) : SceneRotation.Deg0,
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
