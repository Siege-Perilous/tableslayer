export { base64ToUint8, uint8ToBase64 } from './binary';
export { buildRenderProps, type LocalView } from './buildRenderProps';
export { editorCapabilities, playCapabilities, type SessionCapabilities } from './capabilities';
export { upgradeSceneCoordinates } from './coordinateUpgrade';
export {
  ANNOTATION_MASK_KEY,
  DOC_SCHEMA_VERSION,
  classifySceneEvents,
  createPartyWriter,
  createSessionWriter,
  getAnnotationMask,
  getFogMask,
  getPartyState,
  getSceneSettings,
  getSceneSnapshot,
  hydrateGameSessionDoc,
  isDocHydrated,
  listScenes,
  orderBetween,
  type PartyWriter,
  type SessionWriter
} from './docSchema';
export { annotationRowFromDb, lightRowFromDb, markerRowFromDb, sceneRowToSettings } from './fromDb';
export {
  EDITOR_IDLE_POLICY,
  PLAY_IDLE_POLICY,
  createIdleState,
  idlePolicyFromSearch,
  nextDeadline,
  reduceIdle,
  type IdleEffect,
  type IdleEvent,
  type IdlePolicyConfig,
  type IdlePolicyState,
  type SleepReason,
  type WakeReason
} from './idlePolicy';
export {
  PresenceChannel,
  TEMPORARY_LAYER_TTL_MS,
  type CursorData,
  type MeasurementData,
  type MeasurementStyleProps,
  type TemporaryLayer
} from './presence.svelte';
export { SessionDocClient, type ConnectionState, type SessionDocClientOptions } from './SessionDocClient.svelte';
export { SleepController, type SleepControllerOptions } from './SleepController.svelte';
export { reuseUnchanged } from './structuralSharing';
export type {
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
