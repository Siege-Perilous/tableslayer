// Utility function to set properties if they exist

import type { StageProps } from '@tableslayer/ui';
import { devLog } from './debug';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setIfExists(source: Record<string, any>, target: Record<string, any>, map: Record<string, string>) {
  for (const [sourceKey, targetKey] of Object.entries(map)) {
    if (source[sourceKey] !== undefined) {
      target[targetKey] = source[sourceKey];
    }
  }
}

// Utility function for nested properties
function setNestedIfExists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: Record<string, any>,
  parentKey: string,
  map: Record<string, string>
) {
  if (!source[parentKey]) return;

  for (const [sourceKey, targetKey] of Object.entries(map)) {
    // Handle nested keys by splitting on "."
    const keys = sourceKey.split('.');
    let value = source[parentKey];
    for (const key of keys) {
      if (value == null) break; // Stop if any part of the path is missing
      value = value[key];
    }

    if (value !== undefined) {
      target[targetKey] = value;
    }
  }
}

export const convertPropsToSceneDetails = (
  stageProps: Partial<StageProps>,
  mapThumbLocation: string | null
): Partial<Record<string, unknown>> => {
  const details: Partial<Record<string, unknown>> = {};
  // Direct mapping
  setIfExists(stageProps, details, {
    backgroundColor: 'backgroundColor'
  });

  // Set map thumb location if available
  if (mapThumbLocation) {
    details.mapThumbLocation = mapThumbLocation;
  }

  // Nested mappings
  setNestedIfExists(stageProps, details, 'display', {
    'padding.x': 'displayPaddingX',
    'padding.y': 'displayPaddingY',
    'size.x': 'displaySizeX',
    'size.y': 'displaySizeY',
    'resolution.x': 'displayResolutionX',
    'resolution.y': 'displayResolutionY'
  });

  setNestedIfExists(stageProps, details, 'edgeOverlay', {
    enabled: 'edgeEnabled',
    opacity: 'edgeOpacity',
    fadeStart: 'edgeFadeStart',
    fadeEnd: 'edgeFadeEnd',
    scale: 'edgeScale',
    url: 'edgeUrl'
  });

  setNestedIfExists(stageProps, details, 'fog', {
    enabled: 'fogEnabled',
    color: 'fogColor',
    opacity: 'fogOpacity'
  });

  setNestedIfExists(stageProps, details, 'fogOfWar', {
    url: 'fogOfWarUrl',
    'noise.baseColor': 'fogOfWarColor',
    opacity: 'fogOfWarOpacity'
  });

  setNestedIfExists(stageProps, details, 'grid', {
    gridType: 'gridType',
    spacing: 'gridSpacing',
    opacity: 'gridOpacity',
    lineColor: 'gridLineColor',
    lineThickness: 'gridLineThickness',
    shadowColor: 'gridShadowColor',
    shadowOpacity: 'gridShadowOpacity',
    shadowBlur: 'gridShadowBlur',
    shadowSpread: 'gridShadowSpread'
  });

  setNestedIfExists(stageProps, details, 'weather', {
    type: 'weatherType',
    fov: 'weatherFov',
    intensity: 'weatherIntensity',
    opacity: 'weatherOpacity'
  });

  setNestedIfExists(stageProps, details, 'map', {
    rotation: 'mapRotation',
    'offset.x': 'mapOffsetX',
    'offset.y': 'mapOffsetY',
    zoom: 'mapZoom'
  });

  // Debug logging for map properties during save
  devLog('[convertPropsToSceneDetails] Map properties being saved:', {
    mapRotation: details.mapRotation,
    mapOffsetX: details.mapOffsetX,
    mapOffsetY: details.mapOffsetY,
    mapZoom: details.mapZoom,
    sourceMapData: stageProps.map
  });

  setNestedIfExists(stageProps, details, 'marker', {
    'shape.strokeColor': 'markerStrokeColor',
    'shape.strokeWidth': 'markerStrokeWidth',
    'text.color': 'markerTextColor',
    'text.strokeColor': 'markerTextStrokeColor'
  });

  setNestedIfExists(stageProps, details, 'postProcessing', {
    'bloom.intensity': 'effectsBloomIntensity',
    'bloom.threshold': 'effectsBloomThreshold',
    'bloom.smoothing': 'effectsBloomSmoothing',
    'bloom.radius': 'effectsBloomRadius',
    'bloom.levels': 'effectsBloomLevels',
    'bloom.mipmapBlur': 'effectsBloomMipMapBlur',
    'chromaticAberration.offset': 'effectsChromaticAberrationOffset',
    'lut.url': 'effectsLutUrl',
    'toneMapping.mode': 'effectsToneMappingMode'
  });

  // IMPORTANT: Don't extract mapLocation from stage props
  // The mapLocation should only be updated when a new map is uploaded via UpdateMapImage
  // This prevents accidentally overwriting mapLocation with thumbnail paths

  setNestedIfExists(stageProps, details, 'scene', {
    'offset.x': 'sceneOffsetX',
    'offset.y': 'sceneOffsetY',
    rotation: 'sceneRotation'
  });

  // Save annotation layers as JSON
  if (stageProps.annotations?.layers && stageProps.annotations.layers.length > 0) {
    details.annotationLayers = JSON.stringify(stageProps.annotations.layers);
  }

  return details;
};
