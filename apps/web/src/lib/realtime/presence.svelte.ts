import type { StagePerformanceSetting } from '$lib/stores/stagePerformance.svelte';
import type { HoveredMarker } from '@tableslayer/stage';
import type YPartyKitProvider from 'y-partykit/provider';

type Awareness = YPartyKitProvider['awareness'];

export interface CursorData {
  userId: string;
  worldPosition: { x: number; y: number; z: number };
  color?: string;
  label?: string;
  lastMoveTime: number;
  clientId?: number;
}

export interface MeasurementData {
  userId: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  type: number;
  timestamp: number;
  clientId?: number;
  color: string;
  thickness: number;
  outlineColor: string;
  outlineThickness: number;
  opacity: number;
  markerSize: number;
  autoHideDelay: number;
  fadeoutTime: number;
  showDistance: boolean;
  snapToGrid: boolean;
  enableDMG252: boolean;
  beamWidth?: number;
  coneAngle?: number;
}

export interface MeasurementStyleProps {
  color: string;
  thickness: number;
  outlineColor: string;
  outlineThickness: number;
  opacity: number;
  markerSize: number;
  autoHideDelay: number;
  fadeoutTime: number;
  showDistance: boolean;
  snapToGrid: boolean;
  enableDMG252: boolean;
  beamWidth?: number;
  coneAngle?: number;
}

export interface TemporaryLayer {
  id: string;
  isTemporary: boolean;
  createdAt: number;
  expiresAt: number;
  color: string;
  maskData: string; // Base64 RLE data (small enough for awareness payloads)
  creatorId: string;
  opacity: number;
  name: string;
  effectType?: number;
}

export const TEMPORARY_LAYER_TTL_MS = 10000;

/** Refresh awareness before Y.js's 30s timeout drops idle clients. */
const HEARTBEAT_INTERVAL_MS = 15000;

/**
 * Reactive wrapper around Y.js awareness for all ephemeral, never-persisted state:
 * cursors, measurements, hovered/pinned markers, and temporary player drawings.
 */
export class PresenceChannel {
  cursors = $state<Record<string, CursorData>>({});
  measurements = $state<Record<string, MeasurementData>>({});
  hoveredMarker = $state<HoveredMarker | null>(null);
  pinnedMarkers = $state<string[]>([]);
  temporaryLayers = $state<TemporaryLayer[]>([]);
  stagePerformance = $state<StagePerformanceSetting | null>(null);

  #awareness: Awareness;
  #userId: string;
  #heartbeat: ReturnType<typeof setInterval>;

  constructor(awareness: Awareness, userId: string) {
    this.#awareness = awareness;
    this.#userId = userId;
    this.#awareness.on('change', this.#readStates);
    this.#heartbeat = setInterval(() => this.#refresh(), HEARTBEAT_INTERVAL_MS);
  }

  #readStates = () => {
    const cursors: Record<string, CursorData> = {};
    const measurements: Record<string, MeasurementData> = {};
    let hoveredMarker: HoveredMarker | null = null;
    let pinnedMarkers: string[] = [];
    const temporaryLayers: TemporaryLayer[] = [];
    let stagePerformance: StagePerformanceSetting | null = null;

    this.#awareness.getStates().forEach((state, clientId) => {
      if (state.cursor && clientId !== this.#awareness.clientID) {
        cursors[`${state.cursor.userId}_${clientId}`] = { ...state.cursor, clientId };
      }
      if (state.measurement) {
        measurements[`${state.measurement.userId}_${clientId}`] = { ...state.measurement, clientId };
      }
      if (state.hoveredMarker) {
        hoveredMarker = state.hoveredMarker as HoveredMarker;
      }
      if (Array.isArray(state.pinnedMarkers) && state.pinnedMarkers.length > 0) {
        pinnedMarkers = state.pinnedMarkers;
      }
      if (Array.isArray(state.temporaryLayers)) {
        temporaryLayers.push(...state.temporaryLayers);
      }
      if (state.stagePerformance?.setting) {
        stagePerformance = state.stagePerformance.setting as StagePerformanceSetting;
      }
    });

    this.cursors = cursors;
    this.measurements = measurements;
    this.hoveredMarker = hoveredMarker;
    this.pinnedMarkers = pinnedMarkers;
    this.temporaryLayers = temporaryLayers;
    this.stagePerformance = stagePerformance;
  };

  #refresh() {
    const current = this.#awareness.getLocalState();
    if (current) this.#awareness.setLocalState(current);
  }

  updateCursor(worldPosition: { x: number; y: number; z: number }, color?: string, label?: string) {
    this.#awareness.setLocalStateField('cursor', {
      userId: this.#userId,
      worldPosition,
      color: color || '#ffffff',
      label: label || this.#userId,
      lastMoveTime: Date.now()
    });
  }

  updateMeasurement(
    startPoint: { x: number; y: number } | null,
    endPoint: { x: number; y: number } | null,
    type: number,
    style?: MeasurementStyleProps
  ) {
    if (startPoint === null || endPoint === null) {
      this.#awareness.setLocalStateField('measurement', null);
      return;
    }
    this.#awareness.setLocalStateField('measurement', {
      userId: this.#userId,
      startPoint,
      endPoint,
      type,
      timestamp: Date.now(),
      color: style?.color ?? '#FFFFFF',
      thickness: style?.thickness ?? 12,
      outlineColor: style?.outlineColor ?? '#000000',
      outlineThickness: style?.outlineThickness ?? 4,
      opacity: style?.opacity ?? 1,
      markerSize: style?.markerSize ?? 24,
      autoHideDelay: style?.autoHideDelay ?? 3000,
      fadeoutTime: style?.fadeoutTime ?? 500,
      showDistance: style?.showDistance ?? true,
      snapToGrid: style?.snapToGrid ?? true,
      enableDMG252: style?.enableDMG252 ?? true,
      beamWidth: style?.beamWidth,
      coneAngle: style?.coneAngle
    });
  }

  updateHoveredMarker(marker: HoveredMarker | null) {
    this.#awareness.setLocalStateField('hoveredMarker', marker);
  }

  updatePinnedMarkers(markerIds: string[]) {
    this.#awareness.setLocalStateField('pinnedMarkers', markerIds);
  }

  /**
   * Broadcasts the DM's stage performance setting so connected playfields
   * mirror it. Playfields persist the received value locally, so it survives
   * reloads even when the editor is offline.
   */
  updateStagePerformance(setting: StagePerformanceSetting) {
    this.#awareness.setLocalStateField('stagePerformance', { setting, userId: this.#userId });
  }

  #ownTemporaryLayers(): TemporaryLayer[] {
    const layers = this.#awareness.getLocalState()?.temporaryLayers;
    return Array.isArray(layers) ? layers : [];
  }

  broadcastTemporaryLayer(layer: TemporaryLayer) {
    // Never mutate the stored array: y-protocols deep-compares prev vs next
    // state to decide whether to emit 'change', and an in-place edit makes the
    // comparison see "no change" — our own reactive state would go stale.
    const layers = this.#ownTemporaryLayers();
    const index = layers.findIndex((l) => l.id === layer.id);
    const next = index >= 0 ? layers.map((l, i) => (i === index ? layer : l)) : [...layers, layer];
    this.#awareness.setLocalStateField('temporaryLayers', next);
  }

  removeTemporaryLayer(layerId: string) {
    this.#awareness.setLocalStateField(
      'temporaryLayers',
      this.#ownTemporaryLayers().filter((l) => l.id !== layerId)
    );
  }

  /** Drop this client's expired temporary layers; call on a coarse interval. */
  cleanupExpiredTemporaryLayers() {
    const now = Date.now();
    const layers = this.#ownTemporaryLayers();
    const valid = layers.filter((l) => l.expiresAt > now);
    if (valid.length !== layers.length) {
      this.#awareness.setLocalStateField('temporaryLayers', valid);
    }
  }

  createTemporaryLayer(
    layerId: string,
    color: string,
    maskData: string,
    options?: { ttlMs?: number; effectType?: number }
  ): TemporaryLayer {
    const now = Date.now();
    return {
      id: layerId,
      isTemporary: true,
      createdAt: now,
      expiresAt: now + (options?.ttlMs ?? TEMPORARY_LAYER_TTL_MS),
      color,
      maskData,
      creatorId: this.#userId,
      opacity: 1,
      name: 'Temporary drawing',
      effectType: options?.effectType
    };
  }

  destroy() {
    clearInterval(this.#heartbeat);
    this.#awareness.off('change', this.#readStates);
  }
}
