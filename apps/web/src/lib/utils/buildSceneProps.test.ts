import type { SelectLight, SelectMarker, SelectScene } from '$lib/db/app/schema';
import { GridMode } from '@tableslayer/stage';
import { describe, expect, it } from 'vitest';
import { buildSceneProps } from './buildSceneProps';

const baseScene = {
  id: 'scene-1',
  gameSessionId: 'session-1',
  name: 'Test scene',
  order: 1,
  backgroundColor: '#0b0b0c',
  displayPaddingX: 16,
  displayPaddingY: 16,
  displaySizeX: 38.4,
  displaySizeY: 21.6,
  displayResolutionX: 1920,
  displayResolutionY: 1080,
  fogOfWarUrl: null,
  fogOfWarColor: '#CCC',
  fogOfWarOpacityDm: 0.5,
  fogOfWarOpacityPlayer: 0.9,
  mapLocation: null,
  mapThumbLocation: null,
  mapRotation: 0,
  mapOffsetX: 100,
  mapOffsetY: -50,
  mapZoom: 2,
  gridType: 0,
  gridMode: GridMode.MapDefined,
  gridMapDefinedX: 20,
  gridMapDefinedY: 14,
  mapCoordVersion: 0,
  gridSpacing: 1,
  gridOpacity: 0.8,
  gridLineColor: '#E6E6E6',
  gridLineThickness: 1,
  gridShadowColor: '#000000',
  gridShadowSpread: 2,
  gridShadowBlur: 0.5,
  gridShadowOpacity: 0.4,
  sceneOffsetX: 0,
  sceneOffsetY: 0,
  sceneRotation: 0,
  weatherFov: 60,
  weatherIntensity: 1,
  weatherOpacity: 1,
  weatherType: 0,
  fogEnabled: false,
  fogColor: '#a0a0a0',
  fogOpacity: 0.8,
  edgeEnabled: false,
  edgeUrl: null,
  edgeOpacity: 0.3,
  edgeScale: 2,
  edgeFadeStart: 0.2,
  edgeFadeEnd: 1,
  effectsEnabled: true,
  effectsBloomIntensity: 0,
  effectsBloomThreshold: 0.5,
  effectsBloomSmoothing: 0.3,
  effectsBloomRadius: 0.5,
  effectsBloomLevels: 10,
  effectsBloomMipMapBlur: true,
  effectsChromaticAberrationOffset: 0,
  effectsLutUrl: null,
  effectsToneMappingMode: 0,
  markerStrokeColor: '#000000',
  markerStrokeWidth: 50,
  markerTextColor: '#ffffff',
  markerTextStrokeColor: '#000000'
} as unknown as SelectScene;

const marker = {
  id: 'marker-1',
  sceneId: 'scene-1',
  visibility: 0,
  title: 'Token',
  label: 'A1',
  imageLocation: null,
  imageScale: 1,
  positionX: 300,
  positionY: 150,
  shape: 1,
  shapeColor: '#ffffff',
  size: 1,
  note: null,
  pinnedTooltip: false
} as unknown as SelectMarker;

const light = {
  id: 'light-1',
  sceneId: 'scene-1',
  positionX: 300,
  positionY: 150,
  radius: 2,
  color: '#ffffff',
  style: 'lantern',
  pulse: 1,
  opacity: 1
} as unknown as SelectLight;

describe('buildSceneProps coordinate conversion', () => {
  it('converts v0 MapDefined positions to map-local coordinates on read', () => {
    // (300,150) display px with map offset (100,-50), zoom 2 → (100,100) map px
    const props = buildSceneProps(baseScene, [marker], 'editor', [], [light]);
    expect(props.marker.markers[0].position.x).toBeCloseTo(100, 10);
    expect(props.marker.markers[0].position.y).toBeCloseTo(100, 10);
    expect(props.light.lights[0].position.x).toBeCloseTo(100, 10);
    expect(props.light.lights[0].position.y).toBeCloseTo(100, 10);
  });

  it('passes v1 MapDefined positions through untouched', () => {
    const scene = { ...baseScene, mapCoordVersion: 1 } as SelectScene;
    const props = buildSceneProps(scene, [marker], 'editor', [], [light]);
    expect(props.marker.markers[0].position).toEqual({ x: 300, y: 150 });
    expect(props.light.lights[0].position).toEqual({ x: 300, y: 150 });
  });

  it('never converts FillSpace positions, regardless of the version flag', () => {
    const scene = { ...baseScene, gridMode: GridMode.FillSpace, mapCoordVersion: 0 } as SelectScene;
    const props = buildSceneProps(scene, [marker], 'editor', [], [light]);
    expect(props.marker.markers[0].position).toEqual({ x: 300, y: 150 });
  });
});
