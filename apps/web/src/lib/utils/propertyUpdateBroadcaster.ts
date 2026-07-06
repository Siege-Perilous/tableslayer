import type { SceneSettings, SessionDocClient } from '$lib/realtime';
import type { StageProps } from '@tableslayer/stage';
import { convertAnnotationToDbFormat } from './convertStagePropsToAnnotationData';
import { convertStageMarkersToDbFormat } from './convertStagePropsToMarkerData';
import { convertPropsToSceneDetails, sceneSettingsFieldsForPropPaths } from './convertStagePropsToSceneData';

// Doc-backed property updates for the editor's control panels.
//
// Panels call queuePropertyUpdate(stageProps, path, value) exactly as before:
// the value is applied to stageProps synchronously for instant feedback, and
// shared properties are written through to the session doc in a throttled flush
// (leading edge on the next microtask, trailing edge once per animation frame).
// Continuous gestures (map pan, wheel zoom, slider drags) queue an update per
// input event; each flush is one Y transaction and thus one websocket
// broadcast, so the throttle is what keeps a pan from drowning remote peers in
// per-mousemove messages. The page re-derives stageProps from the doc, so local
// mutation and doc state converge. Local-only properties (tools, viewport,
// measurement config) never touch the doc.
//
// Settings writes are FIELD-LEVEL: only fields reachable from the queued paths
// are written, never a full settings snapshot. With two live editors, a full
// snapshot would write this client's stale copy of fields it never touched —
// e.g. a receiver's relockMapZoom write reverting the sender's in-flight pan,
// yanking the map back and forth (rubber-banding) until the gesture ends.

export type PropertyPath = string[];

// View/tool state that stays on this client. Prefix match on the joined path.
const LOCAL_ONLY_PREFIXES = [
  'scene.', // editor workspace viewport (offset/zoom/rotation)
  'activeLayer',
  'annotations.activeLayer',
  'annotations.lineWidth',
  'annotations.smoothingEnabled',
  'marker.snapToGrid', // per-user preference, stored in a cookie
  'light.snapToGrid', // per-user preference, stored in a cookie
  'fogOfWar.tool', // brush size/mode/type are per-user tools
  'measurement', // measurement tool config is ephemeral
  'debug'
];

const isLocalOnlyProperty = (propertyPath: PropertyPath): boolean => {
  const pathString = propertyPath.join('.');
  return LOCAL_ONLY_PREFIXES.some((prefix) =>
    prefix.endsWith('.')
      ? pathString.startsWith(prefix) || pathString === prefix.slice(0, -1)
      : pathString === prefix || pathString.startsWith(`${prefix}.`)
  );
};

interface DocBinding {
  client: SessionDocClient;
  sceneId: string;
}

let binding: DocBinding | null = null;
let latestProps: StageProps | null = null;
let pendingRawSettings: Partial<SceneSettings> | null = null;
const dirtySettingsPaths = new Set<string>();
const dirty = { markers: false, lights: false, annotations: false };

// Leading-edge gate: a write after ≥ one frame of quiet flushes immediately.
// Exported for tests.
export const FLUSH_INTERVAL_MS = 16;
// Backstop for the rAF trailing edge in hidden tabs (rAF is suspended there).
const HIDDEN_TAB_FLUSH_MS = 100;
let flushScheduled = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushRaf: number | null = null;
let lastFlushAt = 0;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  const wait = FLUSH_INTERVAL_MS - (Date.now() - lastFlushAt);
  if (wait <= 0) {
    queueMicrotask(runScheduledFlush);
  } else if (typeof requestAnimationFrame === 'function') {
    // Trailing edge rides rAF so mid-gesture flushes sample once per frame with
    // even spacing — a fixed timer beats against the frame clock and produces
    // uneven step sizes on receivers (visible judder during pans)
    flushRaf = requestAnimationFrame(runScheduledFlush);
    flushTimer = setTimeout(runScheduledFlush, HIDDEN_TAB_FLUSH_MS);
  } else {
    flushTimer = setTimeout(runScheduledFlush, wait);
  }
}

function runScheduledFlush() {
  if (!flushScheduled) return; // already flushed via flushQueuedPropertyUpdates
  flushScheduled = false;
  cancelScheduledFlush();
  lastFlushAt = Date.now();
  flushToDoc();
}

function cancelScheduledFlush() {
  if (flushRaf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(flushRaf);
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushRaf = null;
  flushTimer = null;
}

/** Write any queued updates to the doc now instead of waiting for the throttle. */
export function flushQueuedPropertyUpdates() {
  runScheduledFlush();
}

/** Bind panel property updates to a scene's doc subtree. Call on scene switch. */
export function bindPropertyUpdatesToDoc(client: SessionDocClient, sceneId: string) {
  if (binding && (binding.client !== client || binding.sceneId !== sceneId)) {
    // Pending writes were queued against the previous scene; land them there
    flushQueuedPropertyUpdates();
  }
  binding = { client, sceneId };
}

export function unbindPropertyUpdates() {
  flushQueuedPropertyUpdates();
  binding = null;
}

export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _updateType: 'marker' | 'light' | 'control' | 'scene' = 'control'
) {
  applyUpdate(stageProps as unknown as Record<string, unknown>, propertyPath, value);
  if (isLocalOnlyProperty(propertyPath)) return;

  latestProps = stageProps;
  switch (propertyPath[0]) {
    case 'marker':
      dirty.markers = true;
      break;
    case 'light':
      dirty.lights = true;
      break;
    case 'annotations':
      dirty.annotations = true;
      break;
  }
  // Independent of the collection buckets: some collection-prefixed paths (e.g.
  // marker.shape.*) are global style stored in scene settings
  if (sceneSettingsFieldsForPropPaths([propertyPath.join('.')]).length > 0) {
    dirtySettingsPaths.add(propertyPath.join('.'));
  }

  scheduleFlush();
}

/**
 * Queues scene-settings fields that have no StageProps representation (e.g.
 * mapCoordVersion). Flushed in the same transaction as regular property
 * updates, so a mode toggle plus its coordinate rewrite land as one undo step.
 */
export function queueRawSettingsUpdate(fields: Partial<SceneSettings>) {
  pendingRawSettings = { ...pendingRawSettings, ...fields };
  scheduleFlush();
}

function flushToDoc() {
  const props = latestProps;
  if (!binding) return;
  const { client, sceneId } = binding;

  // One Y transaction per flush; nested writer transactions reuse it (same origin)
  client.doc.transact(() => {
    if (props) {
      if (dirtySettingsPaths.size > 0) {
        const details = convertPropsToSceneDetails(props, null);
        const fields: Partial<Record<string, unknown>> = {};
        for (const field of sceneSettingsFieldsForPropPaths(dirtySettingsPaths)) {
          if (field in details) fields[field] = details[field];
        }
        client.write.setSceneSettings(sceneId, fields as Partial<SceneSettings>);
      }
      if (dirty.markers) syncMarkers(client, sceneId, props);
      if (dirty.lights) syncLights(client, sceneId, props);
      if (dirty.annotations) syncAnnotations(client, sceneId, props);
    }
    if (pendingRawSettings) {
      client.write.setSceneSettings(sceneId, pendingRawSettings);
      pendingRawSettings = null;
    }
  }, client.origin);

  dirtySettingsPaths.clear();
  dirty.markers = dirty.lights = dirty.annotations = false;
}

function syncMarkers(client: SessionDocClient, sceneId: string, props: StageProps) {
  const rows = convertStageMarkersToDbFormat(props.marker?.markers, sceneId);
  const keepIds = new Set(rows.map((row) => row.id));
  for (const existing of client.scene(sceneId)?.markers ?? []) {
    if (!keepIds.has(existing.id)) client.write.deleteMarker(sceneId, existing.id);
  }
  for (const row of rows) {
    if (!row.id) continue;
    client.write.setMarkerFields(sceneId, row.id, { ...row, sceneId });
  }
}

function syncLights(client: SessionDocClient, sceneId: string, props: StageProps) {
  const lights = props.light?.lights ?? [];
  const keepIds = new Set(lights.map((light) => light.id));
  for (const existing of client.scene(sceneId)?.lights ?? []) {
    if (!keepIds.has(existing.id)) client.write.deleteLight(sceneId, existing.id);
  }
  for (const light of lights) {
    client.write.setLightFields(sceneId, light.id, {
      id: light.id,
      sceneId,
      positionX: light.position.x,
      positionY: light.position.y,
      radius: light.radius,
      color: light.color,
      style: light.style,
      pulse: light.pulse,
      opacity: light.opacity ?? 1
    });
  }
}

function syncAnnotations(client: SessionDocClient, sceneId: string, props: StageProps) {
  const layers = props.annotations?.layers ?? [];
  const keepIds = new Set(layers.map((layer) => layer.id));
  for (const existing of client.scene(sceneId)?.annotations ?? []) {
    if (!keepIds.has(existing.id)) client.write.deleteAnnotation(sceneId, existing.id);
  }
  layers.forEach((layer, index) => {
    client.write.setAnnotationFields(sceneId, layer.id, convertAnnotationToDbFormat(layer, sceneId, index));
  });
}

// Helper to apply update at specific path
function applyUpdate(obj: Record<string, unknown>, path: PropertyPath, value: unknown) {
  const lastKey = path[path.length - 1];
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < path.length - 1; i++) {
    if (current[path[i]] === undefined || typeof current[path[i]] !== 'object' || current[path[i]] === null) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }

  current[lastKey] = value;
}
