import * as Y from 'yjs';
import type {
  AnnotationRow,
  GameSessionHydrationData,
  LightRow,
  MarkerRow,
  PartyState,
  SceneChange,
  SceneListEntry,
  ScenePart,
  SceneSettings,
  SceneSnapshot
} from './types';

// Granular Y.js layout for a game session. Every shared value is an individual
// Y.Map key so concurrent edits merge per field (LWW) instead of clobbering whole
// objects. This module is dependency-light on purpose: it is shared between the
// SvelteKit app and the PartyKit server bundle.
//
// gameSession doc
//   meta: Y.Map { schemaVersion, hydratedAt }
//   scenes: Y.Map<sceneId, Y.Map>
//     settings: Y.Map<SceneSettings field, primitive>
//     markers: Y.Map<markerId, Y.Map<MarkerRow field, primitive>>
//     lights: Y.Map<lightId, Y.Map<LightRow field, primitive>>
//     annotations: Y.Map<annotationId, Y.Map<AnnotationRow field | 'mask', primitive | Uint8Array>>
//     fogMask: Uint8Array (RLE)
// party doc
//   state: Y.Map { activeSceneId, isPaused }

export const DOC_SCHEMA_VERSION = 1;
export const ANNOTATION_MASK_KEY = 'mask';

type SceneMap = Y.Map<unknown>;

export const getMeta = (doc: Y.Doc) => doc.getMap<unknown>('meta');
export const getScenesMap = (doc: Y.Doc) => doc.getMap<SceneMap>('scenes');
export const getPartyStateMap = (doc: Y.Doc) => doc.getMap<unknown>('state');

export const isDocHydrated = (doc: Y.Doc): boolean => getMeta(doc).get('schemaVersion') === DOC_SCHEMA_VERSION;

const yMapToObject = <T>(map: Y.Map<unknown>, omit?: string): T => {
  const obj: Record<string, unknown> = {};
  map.forEach((value, key) => {
    if (key !== omit) obj[key] = value;
  });
  return obj as T;
};

const setChangedFields = (map: Y.Map<unknown>, fields: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && map.get(key) !== value) {
      map.set(key, value);
    }
  }
};

const rowsOf = <T>(
  scene: SceneMap | undefined,
  collection: 'markers' | 'lights' | 'annotations',
  omit?: string
): T[] => {
  const rows: T[] = [];
  const map = scene?.get(collection) as Y.Map<Y.Map<unknown>> | undefined;
  map?.forEach((row) => rows.push(yMapToObject<T>(row, omit)));
  return rows;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const getSceneSettings = (doc: Y.Doc, sceneId: string): SceneSettings | null => {
  const settings = getScenesMap(doc).get(sceneId)?.get('settings') as Y.Map<unknown> | undefined;
  return settings ? yMapToObject<SceneSettings>(settings) : null;
};

export const getSceneSnapshot = (doc: Y.Doc, sceneId: string): SceneSnapshot | null => {
  const scene = getScenesMap(doc).get(sceneId);
  const settings = scene?.get('settings') as Y.Map<unknown> | undefined;
  if (!scene || !settings) return null;

  return {
    id: sceneId,
    settings: yMapToObject<SceneSettings>(settings),
    markers: rowsOf<MarkerRow>(scene, 'markers'),
    lights: rowsOf<LightRow>(scene, 'lights'),
    annotations: rowsOf<AnnotationRow>(scene, 'annotations', ANNOTATION_MASK_KEY).sort((a, b) => a.order - b.order)
  };
};

export const listScenes = (doc: Y.Doc): SceneListEntry[] => {
  const entries: SceneListEntry[] = [];
  getScenesMap(doc).forEach((scene, id) => {
    const settings = scene.get('settings') as Y.Map<unknown> | undefined;
    if (!settings) return;
    entries.push({
      id,
      name: settings.get('name') as string,
      order: settings.get('order') as number,
      gameSessionId: settings.get('gameSessionId') as string,
      mapLocation: (settings.get('mapLocation') as string | null) ?? null,
      mapThumbLocation: (settings.get('mapThumbLocation') as string | null) ?? null
    });
  });
  return entries.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
};

export const getFogMask = (doc: Y.Doc, sceneId: string): Uint8Array | null =>
  (getScenesMap(doc).get(sceneId)?.get('fogMask') as Uint8Array | undefined) ?? null;

export const getAnnotationMask = (doc: Y.Doc, sceneId: string, annotationId: string): Uint8Array | null => {
  const annotations = getScenesMap(doc).get(sceneId)?.get('annotations') as Y.Map<Y.Map<unknown>> | undefined;
  return (annotations?.get(annotationId)?.get(ANNOTATION_MASK_KEY) as Uint8Array | undefined) ?? null;
};

export const getPartyState = (doc: Y.Doc): PartyState => {
  const state = getPartyStateMap(doc);
  return {
    activeSceneId: (state.get('activeSceneId') as string | null) ?? null,
    isPaused: (state.get('isPaused') as boolean) ?? false
  };
};

// ---------------------------------------------------------------------------
// Scene ordering (fractional indexing; the server normalizes to integers on persist)
// ---------------------------------------------------------------------------

export const orderBetween = (prev: number | null, next: number | null): number => {
  if (prev === null && next === null) return 1;
  if (prev === null) return next! - 1;
  if (next === null) return prev + 1;
  return (prev + next) / 2;
};

// ---------------------------------------------------------------------------
// Writes — bound to a doc + transaction origin so every local mutation is tagged
// ---------------------------------------------------------------------------

export const createSessionWriter = (doc: Y.Doc, origin: unknown) => {
  const transact = (fn: () => void) => doc.transact(fn, origin);
  const scenes = () => getScenesMap(doc);

  const collectionOf = (sceneId: string, collection: 'markers' | 'lights' | 'annotations') =>
    scenes().get(sceneId)?.get(collection) as Y.Map<Y.Map<unknown>> | undefined;

  const upsertRow = (
    sceneId: string,
    collection: 'markers' | 'lights' | 'annotations',
    id: string,
    fields: Record<string, unknown>
  ) => {
    transact(() => {
      const map = collectionOf(sceneId, collection);
      if (!map) return;
      let row = map.get(id);
      if (!row) {
        row = new Y.Map();
        map.set(id, row);
      }
      setChangedFields(row, fields);
    });
  };

  const deleteRow = (sceneId: string, collection: 'markers' | 'lights' | 'annotations', id: string) => {
    transact(() => collectionOf(sceneId, collection)?.delete(id));
  };

  return {
    createScene(
      settings: SceneSettings,
      content?: {
        markers?: MarkerRow[];
        lights?: LightRow[];
        annotations?: Array<AnnotationRow & { mask?: Uint8Array | null }>;
        fogMask?: Uint8Array | null;
      }
    ) {
      transact(() => {
        const scene = new Y.Map<unknown>();
        scenes().set(settings.id, scene as SceneMap);

        const settingsMap = new Y.Map<unknown>();
        scene.set('settings', settingsMap);
        setChangedFields(settingsMap, settings as unknown as Record<string, unknown>);

        for (const collection of ['markers', 'lights', 'annotations'] as const) {
          const map = new Y.Map<Y.Map<unknown>>();
          scene.set(collection, map);
          for (const row of content?.[collection] ?? []) {
            const rowMap = new Y.Map<unknown>();
            const { mask, ...fields } = row as AnnotationRow & { mask?: Uint8Array | null };
            setChangedFields(rowMap, fields as unknown as Record<string, unknown>);
            if (collection === 'annotations' && mask) rowMap.set(ANNOTATION_MASK_KEY, mask);
            map.set(row.id, rowMap);
          }
        }

        if (content?.fogMask) scene.set('fogMask', content.fogMask);
      });
    },

    deleteScene(sceneId: string) {
      transact(() => scenes().delete(sceneId));
    },

    setSceneSettings(sceneId: string, fields: Partial<SceneSettings>) {
      transact(() => {
        const settings = scenes().get(sceneId)?.get('settings') as Y.Map<unknown> | undefined;
        if (settings) setChangedFields(settings, fields as Record<string, unknown>);
      });
    },

    setFogMask(sceneId: string, mask: Uint8Array) {
      transact(() => scenes().get(sceneId)?.set('fogMask', mask));
    },

    upsertMarker(sceneId: string, marker: MarkerRow) {
      upsertRow(sceneId, 'markers', marker.id, marker as unknown as Record<string, unknown>);
    },
    setMarkerFields(sceneId: string, markerId: string, fields: Partial<MarkerRow>) {
      upsertRow(sceneId, 'markers', markerId, fields as Record<string, unknown>);
    },
    deleteMarker(sceneId: string, markerId: string) {
      deleteRow(sceneId, 'markers', markerId);
    },

    upsertLight(sceneId: string, light: LightRow) {
      upsertRow(sceneId, 'lights', light.id, light as unknown as Record<string, unknown>);
    },
    setLightFields(sceneId: string, lightId: string, fields: Partial<LightRow>) {
      upsertRow(sceneId, 'lights', lightId, fields as Record<string, unknown>);
    },
    deleteLight(sceneId: string, lightId: string) {
      deleteRow(sceneId, 'lights', lightId);
    },

    upsertAnnotation(sceneId: string, annotation: AnnotationRow, mask?: Uint8Array | null) {
      transact(() => {
        upsertRow(sceneId, 'annotations', annotation.id, annotation as unknown as Record<string, unknown>);
        if (mask) {
          collectionOf(sceneId, 'annotations')?.get(annotation.id)?.set(ANNOTATION_MASK_KEY, mask);
        }
      });
    },
    setAnnotationFields(sceneId: string, annotationId: string, fields: Partial<AnnotationRow>) {
      upsertRow(sceneId, 'annotations', annotationId, fields as Record<string, unknown>);
    },
    setAnnotationMask(sceneId: string, annotationId: string, mask: Uint8Array) {
      transact(() => collectionOf(sceneId, 'annotations')?.get(annotationId)?.set(ANNOTATION_MASK_KEY, mask));
    },
    deleteAnnotation(sceneId: string, annotationId: string) {
      deleteRow(sceneId, 'annotations', annotationId);
    }
  };
};

export type SessionWriter = ReturnType<typeof createSessionWriter>;

export const createPartyWriter = (partyDoc: Y.Doc, origin: unknown) => ({
  setActiveScene(sceneId: string | null) {
    partyDoc.transact(() => getPartyStateMap(partyDoc).set('activeSceneId', sceneId), origin);
  },
  setPaused(isPaused: boolean) {
    partyDoc.transact(() => getPartyStateMap(partyDoc).set('isPaused', isPaused), origin);
  }
});

export type PartyWriter = ReturnType<typeof createPartyWriter>;

// ---------------------------------------------------------------------------
// Hydration (server builds the doc from the DB; clients never initialize shared state)
// ---------------------------------------------------------------------------

export const hydrateGameSessionDoc = (doc: Y.Doc, data: GameSessionHydrationData, origin: unknown) => {
  const writer = createSessionWriter(doc, origin);
  doc.transact(() => {
    for (const scene of data.scenes) {
      writer.createScene(scene.settings, scene);
    }
    getMeta(doc).set('schemaVersion', DOC_SCHEMA_VERSION);
    getMeta(doc).set('hydratedAt', Date.now());
  }, origin);
};

// ---------------------------------------------------------------------------
// Change classification for observers
// ---------------------------------------------------------------------------

const SCENE_PARTS: ReadonlySet<string> = new Set(['settings', 'markers', 'lights', 'annotations', 'fogMask']);

export const classifySceneEvents = (events: Y.YEvent<Y.Map<unknown>>[], transaction: Y.Transaction): SceneChange[] => {
  const changes: SceneChange[] = [];
  const remote = !transaction.local;

  for (const event of events) {
    const path = event.path;
    const keys = [...event.changes.keys.keys()];

    if (path.length === 0) {
      // Scenes added/removed at the top level
      changes.push({ sceneId: keys[0] ?? '', part: 'scenes', keys, remote });
    } else if (path.length === 1) {
      // A key set directly on a scene map (fogMask, or a collection map replaced)
      const sceneId = String(path[0]);
      for (const key of keys) {
        if (SCENE_PARTS.has(key)) {
          changes.push({ sceneId, part: key as ScenePart, keys: [key], remote });
        }
      }
    } else if (SCENE_PARTS.has(String(path[1]))) {
      const sceneId = String(path[0]);
      const part = String(path[1]) as ScenePart;
      // path.length === 2 → rows added/removed (keys are row ids)
      // path.length === 3 → fields changed inside a row (path[2] is the row id)
      changes.push({
        sceneId,
        part,
        keys,
        childId: path.length >= 3 ? String(path[2]) : undefined,
        remote
      });
    }
  }

  return changes;
};
