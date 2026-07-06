import type { StageProps } from '@tableslayer/stage';

// Scene-settings field -> its source path in StageProps. The single source of
// truth for full conversion and for the broadcaster's field-level filtering
// (sceneSettingsFieldsForPropPaths), so the two cannot drift.
// mapLocation is deliberately absent: it only changes via UpdateMapImage, and
// deriving it from stage props risks overwriting it with thumbnail paths.
const SETTINGS_FIELD_SOURCES: Record<string, string> = {
  backgroundColor: 'backgroundColor',
  displayPaddingX: 'display.padding.x',
  displayPaddingY: 'display.padding.y',
  displaySizeX: 'display.size.x',
  displaySizeY: 'display.size.y',
  displayResolutionX: 'display.resolution.x',
  displayResolutionY: 'display.resolution.y',
  edgeEnabled: 'edgeOverlay.enabled',
  edgeOpacity: 'edgeOverlay.opacity',
  edgeFadeStart: 'edgeOverlay.fadeStart',
  edgeFadeEnd: 'edgeOverlay.fadeEnd',
  edgeScale: 'edgeOverlay.scale',
  edgeUrl: 'edgeOverlay.url',
  fogEnabled: 'fog.enabled',
  fogColor: 'fog.color',
  fogOpacity: 'fog.opacity',
  fogOfWarUrl: 'fogOfWar.url',
  fogOfWarColor: 'fogOfWar.noise.baseColor',
  fogOfWarOpacityDm: 'fogOfWar.opacity.dm',
  fogOfWarOpacityPlayer: 'fogOfWar.opacity.player',
  gridType: 'grid.gridType',
  gridMode: 'grid.gridMode',
  gridMapDefinedX: 'grid.fixedGridCount.x',
  gridMapDefinedY: 'grid.fixedGridCount.y',
  gridSpacing: 'grid.spacing',
  gridOpacity: 'grid.opacity',
  gridLineColor: 'grid.lineColor',
  gridLineThickness: 'grid.lineThickness',
  gridShadowColor: 'grid.shadowColor',
  gridShadowOpacity: 'grid.shadowOpacity',
  gridShadowBlur: 'grid.shadowBlur',
  gridShadowSpread: 'grid.shadowSpread',
  weatherType: 'weather.type',
  weatherFov: 'weather.fov',
  weatherIntensity: 'weather.intensity',
  weatherOpacity: 'weather.opacity',
  mapRotation: 'map.rotation',
  mapOffsetX: 'map.offset.x',
  mapOffsetY: 'map.offset.y',
  mapZoom: 'map.zoom',
  markerStrokeColor: 'marker.shape.strokeColor',
  markerStrokeWidth: 'marker.shape.strokeWidth',
  markerTextColor: 'marker.text.color',
  markerTextStrokeColor: 'marker.text.strokeColor',
  effectsBloomIntensity: 'postProcessing.bloom.intensity',
  effectsBloomThreshold: 'postProcessing.bloom.threshold',
  effectsBloomSmoothing: 'postProcessing.bloom.smoothing',
  effectsBloomRadius: 'postProcessing.bloom.radius',
  effectsBloomLevels: 'postProcessing.bloom.levels',
  effectsBloomMipMapBlur: 'postProcessing.bloom.mipmapBlur',
  effectsChromaticAberrationOffset: 'postProcessing.chromaticAberration.offset',
  effectsLutUrl: 'postProcessing.lut.url',
  effectsToneMappingMode: 'postProcessing.toneMapping.mode',
  sceneOffsetX: 'scene.offset.x',
  sceneOffsetY: 'scene.offset.y',
  sceneRotation: 'scene.rotation'
};

const resolvePath = (source: Record<string, unknown>, path: string): unknown => {
  let value: unknown = source;
  for (const key of path.split('.')) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
};

/**
 * Settings fields whose source prop path matches any of the given queued
 * paths, in either prefix direction — a queued 'map.offset' covers both
 * mapOffsetX and mapOffsetY; a queued 'grid.spacing' matches gridSpacing.
 */
export const sceneSettingsFieldsForPropPaths = (propPaths: Iterable<string>): string[] => {
  const paths = [...propPaths];
  return Object.entries(SETTINGS_FIELD_SOURCES)
    .filter(([, source]) => paths.some((p) => source === p || source.startsWith(`${p}.`) || p.startsWith(`${source}.`)))
    .map(([field]) => field);
};

export const convertPropsToSceneDetails = (
  stageProps: Partial<StageProps>,
  mapThumbLocation: string | null
): Partial<Record<string, unknown>> => {
  const details: Partial<Record<string, unknown>> = {};

  for (const [field, source] of Object.entries(SETTINGS_FIELD_SOURCES)) {
    const value = resolvePath(stageProps as Record<string, unknown>, source);
    if (value !== undefined) {
      details[field] = value;
    }
  }

  if (mapThumbLocation) {
    details.mapThumbLocation = mapThumbLocation;
  }

  // Ensure edgeOpacity and edgeScale are proper numbers
  if (details.edgeOpacity !== undefined) {
    const opacity = typeof details.edgeOpacity === 'object' ? 0.3 : Number(details.edgeOpacity);
    details.edgeOpacity = isNaN(opacity) ? 0.3 : opacity;
  }

  if (details.edgeScale !== undefined) {
    const scale = typeof details.edgeScale === 'object' ? 2.0 : Number(details.edgeScale);
    details.edgeScale = isNaN(scale) ? 2.0 : scale;
  }

  // Ensure grid spacing is an integer (database constraint)
  if (details.gridSpacing !== undefined) {
    details.gridSpacing = Math.round(Number(details.gridSpacing));
  }

  // Ensure weather values are proper numbers
  if (details.weatherFov !== undefined) {
    details.weatherFov = Number(details.weatherFov);
  }

  if (details.weatherIntensity !== undefined) {
    details.weatherIntensity = Number(details.weatherIntensity);
  }

  if (details.weatherOpacity !== undefined) {
    details.weatherOpacity = Number(details.weatherOpacity);
  }

  return details;
};
