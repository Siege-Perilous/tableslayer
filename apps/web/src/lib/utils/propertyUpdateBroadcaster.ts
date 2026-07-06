import type { SceneSettings, SessionDocClient } from '$lib/realtime';
import type { StageProps } from '@tableslayer/stage';
import { convertAnnotationToDbFormat } from './convertStagePropsToAnnotationData';
import { convertStageMarkersToDbFormat } from './convertStagePropsToMarkerData';
import { convertPropsToSceneDetails } from './convertStagePropsToSceneData';

// Doc-backed property updates for the editor's control panels.
//
// Panels call queuePropertyUpdate(stageProps, path, value) exactly as before:
// the value is applied to stageProps synchronously for instant feedback, and
// shared properties are written through to the session doc in a throttled flush
// (leading edge on the next microtask, then at most one Y transaction per
// FLUSH_INTERVAL_MS). Continuous gestures (map pan, wheel zoom, slider drags)
// queue an update per input event; each flush is one Y transaction and thus one
// websocket broadcast, so the throttle is what keeps a pan from drowning remote
// peers in per-mousemove messages. The page re-derives stageProps from the doc,
// so local mutation and doc state converge. Local-only properties (tools,
// viewport, measurement config) never touch the doc.

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
const dirty = { settings: false, markers: false, lights: false, annotations: false };

// 33ms ≈ 30 transactions/sec, matching the presence-cursor cadence. Local
// feedback is unaffected (applyUpdate runs synchronously before scheduling).
const FLUSH_INTERVAL_MS = 33;
let flushScheduled = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastFlushAt = 0;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  const wait = FLUSH_INTERVAL_MS - (Date.now() - lastFlushAt);
  if (wait <= 0) {
    queueMicrotask(runScheduledFlush);
  } else {
    flushTimer = setTimeout(runScheduledFlush, wait);
  }
}

function runScheduledFlush() {
  if (!flushScheduled) return; // already flushed via flushQueuedPropertyUpdates
  flushScheduled = false;
  flushTimer = null;
  lastFlushAt = Date.now();
  flushToDoc();
}

/** Write any queued updates to the doc now instead of waiting for the throttle. */
export function flushQueuedPropertyUpdates() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
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
    default:
      dirty.settings = true;
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
      if (dirty.settings) {
        const details = convertPropsToSceneDetails(props, null);
        // annotations live as rows, and the editor viewport is local-only in v2
        delete details.annotationLayers;
        delete details.sceneOffsetX;
        delete details.sceneOffsetY;
        delete details.sceneRotation;
        client.write.setSceneSettings(sceneId, details as Partial<SceneSettings>);
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

  dirty.settings = dirty.markers = dirty.lights = dirty.annotations = false;
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
