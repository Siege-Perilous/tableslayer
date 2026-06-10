import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { uint8ToBase64 } from './binary';
import { getAnnotationMask, getFogMask, getSceneSnapshot, hydrateGameSessionDoc } from './docSchema';
import { hydrationDataFromWire, sceneWireFromDoc, type SessionSnapshotWire } from './wire';

const settings = {
  id: 's1',
  gameSessionId: 'gs1',
  name: 'Scene 1',
  order: 1.5,
  backgroundColor: '#0b0b0c',
  displayPaddingX: 16,
  displayPaddingY: 16,
  displaySizeX: 34.86,
  displaySizeY: 19.6,
  displayResolutionX: 1920,
  displayResolutionY: 1080,
  fogOfWarUrl: null,
  fogOfWarColor: '#CCC',
  fogOfWarOpacityDm: 0.5,
  fogOfWarOpacityPlayer: 0.9,
  mapLocation: 'map/s1.jpg',
  mapThumbLocation: null,
  mapRotation: 0,
  mapOffsetX: 0,
  mapOffsetY: 0,
  mapZoom: 1,
  gridType: 0,
  gridMode: 0,
  gridMapDefinedX: null,
  gridMapDefinedY: null,
  gridSpacing: 50,
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
};

const wire: SessionSnapshotWire = {
  gameSessionId: 'gs1',
  scenes: [
    {
      settings,
      markers: [
        {
          id: 'm1',
          sceneId: 's1',
          visibility: 1,
          title: 'Token',
          label: 'A',
          imageLocation: null,
          imageScale: 1,
          positionX: 3,
          positionY: 4,
          shape: 1,
          shapeColor: '#fff',
          size: 1,
          note: { blocks: [] },
          pinnedTooltip: false
        }
      ],
      lights: [],
      annotations: [
        {
          id: 'a1',
          sceneId: 's1',
          name: 'Notes',
          opacity: 1,
          color: '#FF0000',
          url: null,
          visibility: 1,
          order: 0,
          effectType: null,
          mask: uint8ToBase64(new Uint8Array([4, 5, 6]))
        }
      ],
      fogMask: uint8ToBase64(new Uint8Array([1, 2, 3]))
    }
  ]
};

describe('wire round trip', () => {
  it('hydrates a doc from wire and reads identical wire back out', () => {
    const doc = new Y.Doc();
    hydrateGameSessionDoc(doc, hydrationDataFromWire(wire), 'server-hydration');

    expect(getSceneSnapshot(doc, 's1')?.settings).toEqual(settings);
    expect(getFogMask(doc, 's1')).toEqual(new Uint8Array([1, 2, 3]));
    expect(getAnnotationMask(doc, 's1', 'a1')).toEqual(new Uint8Array([4, 5, 6]));

    const out = sceneWireFromDoc(doc, 's1', ['settings', 'markers', 'lights', 'annotations', 'fogMask']);
    expect(out).toEqual({ ...wire.scenes[0], parts: ['settings', 'markers', 'lights', 'annotations', 'fogMask'] });
  });

  it('includes only dirty parts in the persist payload', () => {
    const doc = new Y.Doc();
    hydrateGameSessionDoc(doc, hydrationDataFromWire(wire), 'server-hydration');

    const out = sceneWireFromDoc(doc, 's1', ['markers']);
    expect(out?.parts).toEqual(['markers']);
    expect(out?.markers).toHaveLength(1);
    expect(out?.annotations).toEqual([]);
    expect(out?.fogMask).toBeNull();
    // Settings always ride along so the upsert can create missing rows
    expect(out?.settings.id).toBe('s1');
  });

  it('returns null for unknown scenes', () => {
    const doc = new Y.Doc();
    expect(sceneWireFromDoc(doc, 'nope', ['settings'])).toBeNull();
  });
});
