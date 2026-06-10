import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { base64ToUint8, uint8ToBase64 } from './binary';
import {
  classifySceneEvents,
  createPartyWriter,
  createSessionWriter,
  getAnnotationMask,
  getFogMask,
  getPartyState,
  getSceneSnapshot,
  hydrateGameSessionDoc,
  isDocHydrated,
  listScenes,
  orderBetween
} from './docSchema';
import type { AnnotationRow, LightRow, MarkerRow, SceneChange, SceneSettings } from './types';

const makeSettings = (id: string, overrides: Partial<SceneSettings> = {}): SceneSettings => ({
  id,
  gameSessionId: 'gs1',
  name: `Scene ${id}`,
  order: 1,
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
  mapLocation: null,
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
  markerTextStrokeColor: '#000000',
  ...overrides
});

const makeMarker = (id: string, sceneId: string, overrides: Partial<MarkerRow> = {}): MarkerRow => ({
  id,
  sceneId,
  visibility: 1,
  title: 'New token',
  label: null,
  imageLocation: null,
  imageScale: 1,
  positionX: 0,
  positionY: 0,
  shape: 1,
  shapeColor: '#ffffff',
  size: 1,
  note: null,
  pinnedTooltip: false,
  ...overrides
});

const makeLight = (id: string, sceneId: string): LightRow => ({
  id,
  sceneId,
  positionX: 5,
  positionY: 5,
  radius: 2,
  color: '#FFA500',
  style: 'lantern',
  pulse: 0,
  opacity: 1
});

const makeAnnotation = (id: string, sceneId: string, order = 0): AnnotationRow => ({
  id,
  sceneId,
  name: 'New Annotation',
  opacity: 1,
  color: '#FF0000',
  url: null,
  visibility: 1,
  order,
  effectType: null
});

/** Live bidirectional relay between two docs (simulates the PartyKit room). */
const connect = (a: Y.Doc, b: Y.Doc) => {
  const relayAB = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'relay') Y.applyUpdate(b, update, 'relay');
  };
  const relayBA = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'relay') Y.applyUpdate(a, update, 'relay');
  };
  a.on('update', relayAB);
  b.on('update', relayBA);
  return () => {
    a.off('update', relayAB);
    b.off('update', relayBA);
  };
};

/** One-shot state exchange (simulates reconnect after offline edits). */
const syncOnce = (a: Y.Doc, b: Y.Doc) => {
  const updateA = Y.encodeStateAsUpdate(a, Y.encodeStateVector(b));
  const updateB = Y.encodeStateAsUpdate(b, Y.encodeStateVector(a));
  Y.applyUpdate(b, updateA, 'relay');
  Y.applyUpdate(a, updateB, 'relay');
};

const hydratedDoc = () => {
  const doc = new Y.Doc();
  hydrateGameSessionDoc(
    doc,
    {
      scenes: [
        {
          settings: makeSettings('s1', { order: 1 }),
          markers: [makeMarker('m1', 's1'), makeMarker('m2', 's1', { positionX: 10 })],
          lights: [makeLight('l1', 's1')],
          annotations: [
            { ...makeAnnotation('a2', 's1', 2), mask: new Uint8Array([9, 9]) },
            makeAnnotation('a1', 's1', 1)
          ],
          fogMask: new Uint8Array([1, 2, 3, 4])
        },
        {
          settings: makeSettings('s2', { order: 2 }),
          markers: [],
          lights: [],
          annotations: []
        }
      ]
    },
    'hydration'
  );
  return doc;
};

describe('docSchema hydration and reads', () => {
  it('round-trips a hydrated session into snapshots', () => {
    const doc = hydratedDoc();

    expect(isDocHydrated(doc)).toBe(true);
    expect(listScenes(doc).map((s) => s.id)).toEqual(['s1', 's2']);

    const snap = getSceneSnapshot(doc, 's1');
    expect(snap?.settings.name).toBe('Scene s1');
    expect(snap?.markers).toHaveLength(2);
    expect(snap?.markers.find((m) => m.id === 'm2')?.positionX).toBe(10);
    expect(snap?.lights[0]?.style).toBe('lantern');
    // Annotations sorted by order, masks included as Uint8Array references
    expect(snap?.annotations.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(snap?.annotations.find((a) => a.id === 'a2')?.mask).toEqual(new Uint8Array([9, 9]));
    // Same reference until the mask is rewritten — feeds reference-based reactivity
    expect(snap?.annotations.find((a) => a.id === 'a2')?.mask).toBe(getAnnotationMask(doc, 's1', 'a2'));

    expect(getFogMask(doc, 's1')).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(getAnnotationMask(doc, 's1', 'a2')).toEqual(new Uint8Array([9, 9]));
    expect(getSceneSnapshot(doc, 'missing')).toBeNull();
  });
});

describe('concurrent edits', () => {
  it('merges edits to different settings fields from two offline clients', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);

    createSessionWriter(a, 'clientA').setSceneSettings('s1', { gridOpacity: 0.25 });
    createSessionWriter(b, 'clientB').setSceneSettings('s1', { name: 'Renamed' });
    syncOnce(a, b);

    for (const doc of [a, b]) {
      const settings = getSceneSnapshot(doc, 's1')!.settings;
      expect(settings.gridOpacity).toBe(0.25);
      expect(settings.name).toBe('Renamed');
    }
  });

  it('merges concurrent drags of different markers', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);

    createSessionWriter(a, 'clientA').setMarkerFields('s1', 'm1', { positionX: 111, positionY: 11 });
    createSessionWriter(b, 'clientB').setMarkerFields('s1', 'm2', { positionX: 222, positionY: 22 });
    syncOnce(a, b);

    for (const doc of [a, b]) {
      const markers = getSceneSnapshot(doc, 's1')!.markers;
      expect(markers.find((m) => m.id === 'm1')?.positionX).toBe(111);
      expect(markers.find((m) => m.id === 'm2')?.positionX).toBe(222);
    }
  });

  it('converges to the same winner when both clients edit the same field', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);

    createSessionWriter(a, 'clientA').setSceneSettings('s1', { mapZoom: 2 });
    createSessionWriter(b, 'clientB').setSceneSettings('s1', { mapZoom: 3 });
    syncOnce(a, b);

    const zoomA = getSceneSnapshot(a, 's1')!.settings.mapZoom;
    const zoomB = getSceneSnapshot(b, 's1')!.settings.mapZoom;
    expect(zoomA).toBe(zoomB);
    expect([2, 3]).toContain(zoomA);
  });

  it('syncs marker add/delete and fog mask binary over a live relay', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);
    const disconnect = connect(a, b);

    const writerA = createSessionWriter(a, 'clientA');
    writerA.upsertMarker('s1', makeMarker('m3', 's1', { title: 'Dragon' }));
    writerA.deleteMarker('s1', 'm1');
    writerA.setFogMask('s1', new Uint8Array([7, 7, 7]));

    const markersB = getSceneSnapshot(b, 's1')!.markers.map((m) => m.id);
    expect(markersB).toContain('m3');
    expect(markersB).not.toContain('m1');
    expect(getFogMask(b, 's1')).toEqual(new Uint8Array([7, 7, 7]));
    disconnect();
  });

  it('creates and deletes scenes across clients', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);
    const disconnect = connect(a, b);

    createSessionWriter(a, 'clientA').createScene(makeSettings('s3', { order: orderBetween(2, null) }));
    createSessionWriter(b, 'clientB').deleteScene('s2');

    expect(listScenes(a).map((s) => s.id)).toEqual(['s1', 's3']);
    expect(listScenes(b).map((s) => s.id)).toEqual(['s1', 's3']);
    disconnect();
  });
});

describe('classifySceneEvents', () => {
  const collect = (doc: Y.Doc) => {
    const changes: SceneChange[] = [];
    doc.getMap('scenes').observeDeep((events, txn) => {
      changes.push(...classifySceneEvents(events as Y.YEvent<Y.Map<unknown>>[], txn));
    });
    return changes;
  };

  it('classifies local settings/marker/fog changes with remote=false', () => {
    const doc = hydratedDoc();
    const changes = collect(doc);
    const writer = createSessionWriter(doc, 'me');

    writer.setSceneSettings('s1', { gridOpacity: 0.1 });
    writer.setMarkerFields('s1', 'm1', { positionX: 5 });
    writer.setFogMask('s1', new Uint8Array([1]));

    expect(changes).toEqual([
      { sceneId: 's1', part: 'settings', keys: ['gridOpacity'], childId: undefined, remote: false, undoRedo: false },
      { sceneId: 's1', part: 'markers', keys: ['positionX'], childId: 'm1', remote: false, undoRedo: false },
      { sceneId: 's1', part: 'fogMask', keys: ['fogMask'], remote: false, undoRedo: false }
    ]);
  });

  it('flags changes applied from another client as remote', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);
    const disconnect = connect(a, b);
    const changesB = collect(b);

    createSessionWriter(a, 'clientA').setAnnotationMask('s1', 'a1', new Uint8Array([5]));

    expect(changesB).toEqual([
      { sceneId: 's1', part: 'annotations', keys: ['mask'], childId: 'a1', remote: true, undoRedo: false }
    ]);
    disconnect();
  });

  it('flags undo/redo transactions while keeping them local', () => {
    const doc = hydratedDoc();
    const undoManager = new Y.UndoManager(doc.getMap('scenes').get('s1') as Y.Map<unknown>, {
      trackedOrigins: new Set(['me'])
    });
    createSessionWriter(doc, 'me').setSceneSettings('s1', { gridOpacity: 0.1 });

    const changes = collect(doc);
    undoManager.undo();

    expect(changes).toEqual([
      { sceneId: 's1', part: 'settings', keys: ['gridOpacity'], childId: undefined, remote: false, undoRedo: true }
    ]);
  });

  it('does not emit events for writes that do not change values', () => {
    const doc = hydratedDoc();
    const changes = collect(doc);

    createSessionWriter(doc, 'me').setSceneSettings('s1', { gridOpacity: 0.8, name: 'Scene s1' });

    expect(changes).toEqual([]);
  });
});

describe('undo/redo (Y.UndoManager semantics)', () => {
  const sceneUndoManager = (doc: Y.Doc, sceneId: string, origin: unknown) =>
    new Y.UndoManager(doc.getMap('scenes').get(sceneId) as Y.Map<unknown>, {
      trackedOrigins: new Set([origin])
    });

  it('undoes and redoes a settings change, converging across live clients', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);
    const disconnect = connect(a, b);
    const undoManager = sceneUndoManager(a, 's1', 'me');

    createSessionWriter(a, 'me').setSceneSettings('s1', { gridOpacity: 0.25 });
    expect(undoManager.canUndo()).toBe(true);

    undoManager.undo();
    expect(getSceneSnapshot(a, 's1')!.settings.gridOpacity).toBe(0.8);
    expect(getSceneSnapshot(b, 's1')!.settings.gridOpacity).toBe(0.8);

    undoManager.redo();
    expect(getSceneSnapshot(a, 's1')!.settings.gridOpacity).toBe(0.25);
    expect(getSceneSnapshot(b, 's1')!.settings.gridOpacity).toBe(0.25);
    disconnect();
  });

  it('ignores remote and untracked-origin (system) transactions', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);
    const disconnect = connect(a, b);
    const undoManager = sceneUndoManager(a, 's1', 'me');

    createSessionWriter(b, 'them').setSceneSettings('s1', { name: 'Remote rename' });
    createSessionWriter(a, 'system').setSceneSettings('s1', { mapThumbLocation: 'thumb.png' });

    expect(undoManager.canUndo()).toBe(false);
    disconnect();
  });

  it('restores a deleted marker with all of its fields', () => {
    const doc = hydratedDoc();
    const undoManager = sceneUndoManager(doc, 's1', 'me');

    createSessionWriter(doc, 'me').deleteMarker('s1', 'm2');
    expect(getSceneSnapshot(doc, 's1')!.markers.map((m) => m.id)).not.toContain('m2');

    undoManager.undo();
    const restored = getSceneSnapshot(doc, 's1')!.markers.find((m) => m.id === 'm2');
    expect(restored?.positionX).toBe(10);
  });

  it('restores the previous fog mask bytes', () => {
    const doc = hydratedDoc();
    const undoManager = sceneUndoManager(doc, 's1', 'me');
    const writer = createSessionWriter(doc, 'me');

    writer.setFogMask('s1', new Uint8Array([5, 5]));
    undoManager.undo();
    expect(getFogMask(doc, 's1')).toEqual(new Uint8Array([1, 2, 3, 4]));
    undoManager.redo();
    expect(getFogMask(doc, 's1')).toEqual(new Uint8Array([5, 5]));
  });

  it('merges rapid writes into one step and splits on stopCapturing', () => {
    const doc = hydratedDoc();
    const undoManager = sceneUndoManager(doc, 's1', 'me');
    const writer = createSessionWriter(doc, 'me');

    writer.setSceneSettings('s1', { mapZoom: 2 });
    writer.setSceneSettings('s1', { mapZoom: 4 }); // within captureTimeout — merges
    undoManager.stopCapturing();
    writer.setSceneSettings('s1', { mapZoom: 8 });

    expect(undoManager.undoStack).toHaveLength(2);
    undoManager.undo();
    expect(getSceneSnapshot(doc, 's1')!.settings.mapZoom).toBe(4);
    undoManager.undo();
    expect(getSceneSnapshot(doc, 's1')!.settings.mapZoom).toBe(1);
  });

  it('pins the same-field reconciliation: undo does not clobber a newer remote write', () => {
    const a = hydratedDoc();
    const b = new Y.Doc();
    syncOnce(a, b);
    const disconnect = connect(a, b);
    const undoManager = sceneUndoManager(a, 's1', 'me');

    createSessionWriter(a, 'me').setSceneSettings('s1', { mapZoom: 2 });
    createSessionWriter(b, 'them').setSceneSettings('s1', { mapZoom: 3 });
    undoManager.undo();

    const zoomA = getSceneSnapshot(a, 's1')!.settings.mapZoom;
    const zoomB = getSceneSnapshot(b, 's1')!.settings.mapZoom;
    expect(zoomA).toBe(zoomB);
    // The remote write already displaced the tracked item, so undoing it is a
    // no-op for that key — the newer remote value survives. Undo never reverts
    // another collaborator's work, even on the same field.
    expect(zoomA).toBe(3);
  });
});

describe('party doc', () => {
  it('reads and writes party state', () => {
    const doc = new Y.Doc();
    expect(getPartyState(doc)).toEqual({ activeSceneId: null, isPaused: false });

    const writer = createPartyWriter(doc, 'me');
    writer.setActiveScene('s2');
    writer.setPaused(true);
    expect(getPartyState(doc)).toEqual({ activeSceneId: 's2', isPaused: true });
  });
});

describe('helpers', () => {
  it('orderBetween produces sortable values', () => {
    expect(orderBetween(null, null)).toBe(1);
    expect(orderBetween(2, null)).toBe(3);
    expect(orderBetween(null, 1)).toBe(0);
    const mid = orderBetween(1, 2);
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(2);
  });

  it('base64 round-trips binary masks', () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256);
    expect(base64ToUint8(uint8ToBase64(bytes))).toEqual(bytes);
  });
});
