import type * as Y from 'yjs';
import { base64ToUint8, uint8ToBase64 } from './binary';
import { getAnnotationMask, getFogMask, getSceneSnapshot } from './docSchema';
import type { AnnotationRow, GameSessionHydrationData, LightRow, MarkerRow, ScenePart, SceneSettings } from './types';

// JSON-safe payloads exchanged between the PartyKit server and the app's internal
// endpoints. Masks travel as base64 strings (matching their DB columns); the doc
// stores them as Uint8Array. Dependency-light: bundled into the PartyKit server.

export interface SceneWire {
  settings: SceneSettings;
  markers: MarkerRow[];
  lights: LightRow[];
  annotations: Array<AnnotationRow & { mask?: string | null }>;
  fogMask?: string | null;
}

export interface SessionSnapshotWire {
  gameSessionId: string;
  scenes: SceneWire[];
}

export interface PersistSessionWire {
  gameSessionId: string;
  scenes: Array<SceneWire & { parts: ScenePart[] }>;
  deletedSceneIds: string[];
}

export interface PartyStateWire {
  activeSceneId: string | null;
  isPaused: boolean;
}

export const hydrationDataFromWire = (wire: SessionSnapshotWire): GameSessionHydrationData => ({
  scenes: wire.scenes.map((scene) => ({
    settings: scene.settings,
    markers: scene.markers,
    lights: scene.lights,
    annotations: scene.annotations.map(({ mask, ...row }) => ({
      ...row,
      mask: mask ? base64ToUint8(mask) : null
    })),
    fogMask: scene.fogMask ? base64ToUint8(scene.fogMask) : null
  }))
});

/** Read one scene out of the doc in wire format, including only the dirty parts' payloads. */
export const sceneWireFromDoc = (
  doc: Y.Doc,
  sceneId: string,
  parts: ScenePart[]
): (SceneWire & { parts: ScenePart[] }) | null => {
  const snapshot = getSceneSnapshot(doc, sceneId);
  if (!snapshot) return null;

  const fogMask = parts.includes('fogMask') ? getFogMask(doc, sceneId) : null;

  return {
    settings: snapshot.settings,
    markers: parts.includes('markers') ? snapshot.markers : [],
    lights: parts.includes('lights') ? snapshot.lights : [],
    annotations: parts.includes('annotations')
      ? snapshot.annotations.map((row) => {
          const mask = getAnnotationMask(doc, sceneId, row.id);
          return { ...row, mask: mask ? uint8ToBase64(mask) : null };
        })
      : [],
    fogMask: fogMask ? uint8ToBase64(fogMask) : null,
    parts
  };
};
