import type { SelectAnnotation, SelectLight, SelectMarker, SelectScene } from '$lib/db/app/schema';
import { buildSceneProps } from '$lib/utils/buildSceneProps';
import type { DrawMode, MapLayerType, StageProps, ToolType } from '@tableslayer/stage';
import type { SceneSnapshot } from './types';

/**
 * Local-only view state layered over the shared doc snapshot. Nothing here is
 * synced or persisted with the scene — it lives in plain component $state and
 * its overrides win for exactly as long as the page keeps them set (e.g. for
 * the duration of a drag gesture), replacing the old timing-window guards.
 */
export interface LocalView {
  mode: 'editor' | 'client';
  activeLayer?: MapLayerType;
  /** Editor workspace camera; never shared. */
  viewport?: {
    offset?: { x: number; y: number };
    zoom?: number;
    rotation?: number;
    autoFit?: boolean;
  };
  /** In-progress map alignment drag (committed to the doc on gesture end). */
  mapTransform?: {
    offset?: { x: number; y: number };
    zoom?: number;
  };
  /** In-progress marker drags by id (committed to the doc on drop). */
  markerPositions?: Record<string, { x: number; y: number }>;
  /** Local tool configuration; brush size/line width are per-user preferences. */
  fogTool?: { type?: ToolType; size?: number; mode?: DrawMode };
  annotations?: {
    activeLayer?: string | null;
    lineWidth?: number;
    smoothingEnabled?: boolean;
  };
  /** Active measurement tool configuration (type, cone angle, beam width). */
  measurement?: { type?: number; coneAngle?: number; beamWidth?: number };
}

/**
 * Pure derivation: shared snapshot + local view -> StageProps. The result is a
 * fresh object each call; interaction callbacks must write to the doc or to the
 * local view, never back into the returned props.
 */
export const buildRenderProps = (snapshot: SceneSnapshot, view: LocalView, bucketUrl?: string): StageProps => {
  // Doc rows structurally match the drizzle Select* row types (see realtime/types.ts)
  const props = buildSceneProps(
    snapshot.settings as unknown as SelectScene,
    snapshot.markers as unknown as SelectMarker[],
    view.mode,
    snapshot.annotations as unknown as SelectAnnotation[],
    snapshot.lights as unknown as SelectLight[],
    bucketUrl
  );

  if (view.activeLayer !== undefined) props.activeLayer = view.activeLayer;

  if (view.viewport?.offset) props.scene.offset = view.viewport.offset;
  if (view.viewport?.zoom !== undefined) props.scene.zoom = view.viewport.zoom;
  if (view.viewport?.rotation !== undefined) props.scene.rotation = view.viewport.rotation;
  if (view.viewport?.autoFit !== undefined) props.scene.autoFit = view.viewport.autoFit;

  if (view.mapTransform?.offset) props.map.offset = view.mapTransform.offset;
  if (view.mapTransform?.zoom !== undefined) props.map.zoom = view.mapTransform.zoom;

  if (view.markerPositions) {
    for (const marker of props.marker.markers) {
      const override = view.markerPositions[marker.id];
      if (override) marker.position = override;
    }
  }

  if (view.fogTool?.type !== undefined) props.fogOfWar.tool.type = view.fogTool.type;
  if (view.fogTool?.size !== undefined) props.fogOfWar.tool.size = view.fogTool.size;
  if (view.fogTool?.mode !== undefined) props.fogOfWar.tool.mode = view.fogTool.mode;

  if (view.annotations?.activeLayer !== undefined) props.annotations.activeLayer = view.annotations.activeLayer;
  if (view.annotations?.lineWidth !== undefined) props.annotations.lineWidth = view.annotations.lineWidth;
  if (view.annotations?.smoothingEnabled !== undefined) {
    props.annotations.smoothingEnabled = view.annotations.smoothingEnabled;
  }

  if (view.measurement?.type !== undefined) props.measurement.type = view.measurement.type;
  if (view.measurement?.coneAngle !== undefined) props.measurement.coneAngle = view.measurement.coneAngle;
  if (view.measurement?.beamWidth !== undefined) props.measurement.beamWidth = view.measurement.beamWidth;

  return props;
};
