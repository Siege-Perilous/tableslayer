// Row types for the shared game session document.
// These structurally mirror the drizzle Select* types in $lib/db/app/schema, but are
// defined locally so this module (and docSchema.ts) can be bundled into the PartyKit
// server without dragging in drizzle/zod. Field names must match the DB columns 1:1 —
// the server persister copies them straight into upserts.

export interface SceneSettings {
  id: string;
  gameSessionId: string;
  name: string;
  order: number;
  backgroundColor: string;
  displayPaddingX: number;
  displayPaddingY: number;
  displaySizeX: number;
  displaySizeY: number;
  displayResolutionX: number;
  displayResolutionY: number;
  fogOfWarUrl: string | null;
  fogOfWarColor: string;
  fogOfWarOpacityDm: number;
  fogOfWarOpacityPlayer: number;
  mapLocation: string | null;
  mapThumbLocation: string | null;
  mapRotation: number;
  mapOffsetX: number;
  mapOffsetY: number;
  mapZoom: number;
  gridType: number;
  gridMode: number;
  gridMapDefinedX: number | null;
  gridMapDefinedY: number | null;
  gridSpacing: number;
  gridOpacity: number;
  gridLineColor: string;
  gridLineThickness: number;
  gridShadowColor: string;
  gridShadowSpread: number;
  gridShadowBlur: number;
  gridShadowOpacity: number;
  sceneOffsetX: number;
  sceneOffsetY: number;
  sceneRotation: number;
  weatherFov: number;
  weatherIntensity: number;
  weatherOpacity: number;
  weatherType: number;
  fogEnabled: boolean;
  fogColor: string;
  fogOpacity: number;
  edgeEnabled: boolean;
  edgeUrl: string | null;
  edgeOpacity: number;
  edgeScale: number;
  edgeFadeStart: number;
  edgeFadeEnd: number;
  effectsEnabled: boolean;
  effectsBloomIntensity: number;
  effectsBloomThreshold: number;
  effectsBloomSmoothing: number;
  effectsBloomRadius: number;
  effectsBloomLevels: number;
  effectsBloomMipMapBlur: boolean;
  effectsChromaticAberrationOffset: number;
  effectsLutUrl: string | null;
  effectsToneMappingMode: number;
  markerStrokeColor: string;
  markerStrokeWidth: number;
  markerTextColor: string;
  markerTextStrokeColor: string;
}

export interface MarkerRow {
  id: string;
  sceneId: string;
  visibility: number;
  title: string;
  label: string | null;
  imageLocation: string | null;
  imageScale: number;
  positionX: number;
  positionY: number;
  shape: number;
  shapeColor: string;
  size: number;
  note: unknown;
  pinnedTooltip: boolean;
}

export interface LightRow {
  id: string;
  sceneId: string;
  positionX: number;
  positionY: number;
  radius: number;
  color: string;
  style: string;
  pulse: number;
  opacity: number;
}

export interface AnnotationRow {
  id: string;
  sceneId: string;
  name: string;
  opacity: number;
  color: string;
  url: string | null;
  visibility: number;
  order: number;
  effectType: number | null;
}

export interface SceneSnapshot {
  id: string;
  settings: SceneSettings;
  markers: MarkerRow[];
  lights: LightRow[];
  /** Includes each annotation's RLE mask as a stable Uint8Array reference. */
  annotations: Array<AnnotationRow & { mask?: Uint8Array | null }>;
}

/** Lightweight entry for scene lists/selectors, derived from settings. */
export interface SceneListEntry {
  id: string;
  name: string;
  order: number;
  gameSessionId: string;
  mapLocation: string | null;
  mapThumbLocation: string | null;
}

export interface PartyState {
  activeSceneId: string | null;
  isPaused: boolean;
}

/** Everything needed to build a session doc from the database. */
export interface GameSessionHydrationData {
  scenes: Array<{
    settings: SceneSettings;
    markers: MarkerRow[];
    lights: LightRow[];
    annotations: Array<AnnotationRow & { mask?: Uint8Array | null }>;
    fogMask?: Uint8Array | null;
  }>;
}

export type ScenePart = 'settings' | 'markers' | 'lights' | 'annotations' | 'fogMask';

export interface SceneChange {
  sceneId: string;
  part: ScenePart | 'scenes';
  /** Changed keys at the event target (settings field names, marker/annotation ids, ...). */
  keys: string[];
  /** Set when the change happened inside a keyed child (markerId, lightId, annotationId). */
  childId?: string;
  /** False when this client's own transaction produced the change. */
  remote: boolean;
  /** True when a local Y.UndoManager produced the change (local, but the canvas
   *  must re-apply masks exactly as it does for remote changes). */
  undoRedo: boolean;
}
