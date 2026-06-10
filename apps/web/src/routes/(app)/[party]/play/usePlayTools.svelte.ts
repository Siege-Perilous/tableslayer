import { base64ToUint8, uint8ToBase64, type AnnotationRow } from '$lib/realtime';
import { devError, devLog } from '$lib/utils/debug';
import {
  IconCircle,
  IconCone2,
  IconLine,
  IconMap,
  IconPaint,
  IconPaintFilled,
  IconPencil,
  IconRectangleVertical,
  IconRestore,
  IconRuler,
  IconShadow,
  IconSquare,
  IconTrash
} from '@tabler/icons-svelte';
import {
  AnnotationEffect,
  DrawMode,
  getDefaultEffectProps,
  MapLayerType,
  MeasurementType,
  StageMode,
  type AnnotationLayerData,
  type RadialMenuItemProps,
  type StageExports
} from '@tableslayer/stage';
import { v4 as uuidv4 } from 'uuid';
import type { PlaySession, SessionRoute } from './usePlaySession.svelte';

const DRAW_COLORS: Record<string, string> = {
  'draw-red': '#d73e2e',
  'draw-orange': '#ffa500',
  'draw-yellow': '#ffd93d',
  'draw-green': '#6bcf7f',
  'draw-blue': '#2e86ab',
  'draw-purple': '#b197fc',
  'draw-pink': '#f06595',
  'draw-turquoise': '#20c997'
};

const DRAW_EFFECTS: Record<string, AnnotationEffect> = {
  'effect-fire': AnnotationEffect.Fire,
  'effect-water': AnnotationEffect.Water,
  'effect-ice': AnnotationEffect.Ice,
  'effect-magic': AnnotationEffect.Magic,
  'effect-grease': AnnotationEffect.Grease,
  'effect-spacetear': AnnotationEffect.SpaceTear
};

const PLAYFIELD_FOG_BRUSH_SIZE = 7.0;
const FOG_COMMIT_DEBOUNCE_MS = 500;
const DRAWING_IDLE_RESET_MS = 3000;
const PERSIST_BUTTON_HIDE_MS = 3000;

export interface PlayToolsOptions {
  session: PlaySession;
  userId: string;
  getStage: () => StageExports | undefined;
  routes: () => SessionRoute[];
  defaultSessionFilter: () => string | undefined;
}

/**
 * Touch-play editing tools: every edit commits straight to the shared doc (fog
 * masks, persisted drawings, scene switches) or to awareness (temporary
 * drawings). There is no save pipeline here — the PartyKit server persists.
 */
export class PlayTools {
  // Local-only view state (never shared)
  activeLayer = $state<MapLayerType>(MapLayerType.None);
  annotationsActiveLayer = $state<string | null>(null);
  lineWidth = $state(1.0);
  fogTool = $state<{ mode: DrawMode; size: number }>({ mode: DrawMode.Erase, size: PLAYFIELD_FOG_BRUSH_SIZE });
  measurement = $state<{ type: number; coneAngle?: number; beamWidth?: number }>({ type: MeasurementType.Line });

  // Temporary drawing state
  currentTemporaryLayerId = $state<string | null>(null);
  tempLayerUrls = $state<Record<string, string>>({});

  // Persist button
  showPersistButton = $state(false);
  persistButtonPosition = $state({ x: 0, y: 0 });

  #options: PlayToolsOptions;
  #persistButtonLayerId: string | null = null;
  #pendingPersistPosition: { x: number; y: number } | null = null;
  #persistButtonTimer: ReturnType<typeof setTimeout> | null = null;
  #resetLayerTimer: ReturnType<typeof setTimeout> | null = null;
  #fogCommitTimer: ReturnType<typeof setTimeout> | null = null;
  #expiryTicker: ReturnType<typeof setInterval>;
  #now = $state(Date.now());
  #loadedTempMasks = new Map<string, string>();

  constructor(options: PlayToolsOptions) {
    this.#options = options;

    // Tick once a second: expires temporary layers (display + own awareness state).
    // Only touch the reactive clock while temp layers exist, so an idle playfield
    // doesn't rebuild its render props every second.
    this.#expiryTicker = setInterval(() => {
      if (this.#temporaryLayers().length === 0) return;
      this.#now = Date.now();
      this.#options.session.presence?.cleanupExpiredTemporaryLayers();
      if (
        this.currentTemporaryLayerId &&
        !this.#temporaryLayers().some((layer) => layer.id === this.currentTemporaryLayerId)
      ) {
        this.currentTemporaryLayerId = null;
      }
    }, 1000);

    // Load RLE masks for temporary layers drawn by other clients
    $effect(() => {
      for (const layer of this.#temporaryLayers()) {
        if (!layer.maskData || this.#loadedTempMasks.get(layer.id) === layer.maskData) continue;
        this.#loadedTempMasks.set(layer.id, layer.maskData);
        // Our own active drawing is already on the canvas
        if (layer.id === this.currentTemporaryLayerId) continue;
        // Give Threlte a beat to create the layer component before loading
        setTimeout(() => this.#loadTempMaskWithRetry(layer.id, layer.maskData), 50);
      }
    });
  }

  #temporaryLayers() {
    return this.#options.session.presence?.temporaryLayers ?? [];
  }

  /** Temporary drawings (all clients) as annotation layers, expired ones dropped. */
  get tempAnnotationLayers(): AnnotationLayerData[] {
    const layers = this.#temporaryLayers();
    if (layers.length === 0) return []; // skip the ticking clock when idle
    const now = this.#now;
    return layers
      .filter((layer) => layer.expiresAt > now || layer.id === this.currentTemporaryLayerId)
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        color: layer.color,
        opacity: layer.opacity,
        url: this.tempLayerUrls[layer.id] ?? null,
        visibility: StageMode.Player,
        effect:
          layer.effectType && layer.effectType !== AnnotationEffect.None
            ? getDefaultEffectProps(layer.effectType as AnnotationEffect)
            : undefined
      }));
  }

  get menuItems(): RadialMenuItemProps[] {
    const routes = this.#options.routes();
    return [
      {
        id: 'scene',
        label: '',
        icon: IconMap,
        submenuLayout: 'table',
        submenu: routes.flatMap((route) =>
          route.scenes.map((scene) => ({
            id: `scene-${scene.id}`,
            label: scene.name,
            gameSessionId: route.id
          }))
        ),
        submenuFilterOptions: routes.map((route) => ({ value: route.id, label: route.name })),
        submenuFilterDefault: this.#options.defaultSessionFilter(),
        submenuFilterKey: 'gameSessionId'
      },
      {
        id: 'fog',
        label: '',
        icon: IconShadow,
        submenu: [
          { id: 'fog-remove', label: '', icon: IconPaint },
          { id: 'fog-add', label: '', icon: IconPaintFilled },
          { id: 'fog-reset', label: '', icon: IconRestore },
          { id: 'fog-clear', label: '', icon: IconTrash }
        ]
      },
      {
        id: 'draw',
        label: '',
        icon: IconPencil,
        submenu: [
          ...Object.entries(DRAW_COLORS).map(([id, color]) => ({ id, label: '', color })),
          ...Object.keys(DRAW_EFFECTS).map((id) => ({ id, label: '', effectType: DRAW_EFFECTS[id] })),
          {
            id: 'draw-delete-all',
            label: '',
            icon: IconTrash,
            submenu: [
              { id: 'draw-delete-all-confirm', label: 'Yes, delete all' },
              { id: 'draw-delete-all-cancel', label: 'Cancel' }
            ]
          }
        ]
      },
      {
        id: 'measure',
        label: '',
        icon: IconRuler,
        submenu: [
          { id: 'measure-line', label: '', icon: IconLine },
          { id: 'measure-circle', label: '', icon: IconCircle },
          { id: 'measure-square', label: '', icon: IconSquare },
          {
            id: 'measure-cone',
            label: '',
            icon: IconCone2,
            submenu: [
              { id: 'measure-cone-30', label: '30°' },
              { id: 'measure-cone-60', label: '60°' },
              { id: 'measure-cone-90', label: '90°' }
            ]
          },
          {
            id: 'measure-beam',
            label: '',
            icon: IconRectangleVertical,
            submenu: [
              { id: 'measure-beam-5', label: '5 ft' },
              { id: 'measure-beam-10', label: '10 ft' },
              { id: 'measure-beam-15', label: '15 ft' },
              { id: 'measure-beam-20', label: '20 ft' }
            ]
          }
        ]
      }
    ];
  }

  clearActiveTool() {
    this.activeLayer = MapLayerType.None;
    this.annotationsActiveLayer = null;
    this.currentTemporaryLayerId = null;
  }

  /**
   * Reset the tool 3s after the user stops drawing, and surface the persist
   * button for the finished temporary drawing. Restarts itself while a stroke
   * is still in progress.
   */
  resetToNoneAfterDelay() {
    if (this.#resetLayerTimer) clearTimeout(this.#resetLayerTimer);
    this.#resetLayerTimer = setTimeout(() => {
      const stage = this.#options.getStage();
      if (stage?.annotations?.isDrawing() || stage?.fogOfWar?.isDrawing()) {
        this.#resetLayerTimer = null;
        this.resetToNoneAfterDelay();
        return;
      }

      if (this.#pendingPersistPosition && this.currentTemporaryLayerId) {
        if (this.#persistButtonTimer) clearTimeout(this.#persistButtonTimer);
        this.#persistButtonLayerId = this.currentTemporaryLayerId;
        this.persistButtonPosition = this.#pendingPersistPosition;
        this.showPersistButton = true;
        this.#pendingPersistPosition = null;
        this.#persistButtonTimer = setTimeout(() => this.dismissPersistButton(), PERSIST_BUTTON_HIDE_MS);
      }

      this.clearActiveTool();
      this.#resetLayerTimer = null;
    }, DRAWING_IDLE_RESET_MS);
  }

  selectMenuItem(itemId: string) {
    devLog('play', 'Menu item selected:', itemId);

    if (itemId.startsWith('scene-')) {
      this.#options.session.switchScene(itemId.replace('scene-', ''));
      return;
    }
    if (itemId in DRAW_COLORS) {
      this.#startTemporaryDrawing(DRAW_COLORS[itemId]);
      return;
    }
    if (itemId in DRAW_EFFECTS) {
      this.#startTemporaryDrawing('#ffffff', DRAW_EFFECTS[itemId]);
      return;
    }

    switch (itemId) {
      case 'fog-remove':
        this.activeLayer = MapLayerType.FogOfWar;
        this.fogTool = { mode: DrawMode.Erase, size: PLAYFIELD_FOG_BRUSH_SIZE };
        break;
      case 'fog-add':
        this.activeLayer = MapLayerType.FogOfWar;
        this.fogTool = { mode: DrawMode.Draw, size: PLAYFIELD_FOG_BRUSH_SIZE };
        break;
      case 'fog-reset':
        this.#options.getStage()?.fogOfWar?.reset();
        this.resetToNoneAfterDelay();
        break;
      case 'fog-clear':
        this.#options.getStage()?.fogOfWar?.clear();
        this.resetToNoneAfterDelay();
        break;
      case 'draw-delete-all-confirm':
        this.#deleteAllDrawings();
        break;
      case 'measure-line':
        this.activeLayer = MapLayerType.Measurement;
        this.measurement = { type: MeasurementType.Line };
        break;
      case 'measure-circle':
        this.activeLayer = MapLayerType.Measurement;
        this.measurement = { type: MeasurementType.Circle };
        break;
      case 'measure-square':
        this.activeLayer = MapLayerType.Measurement;
        this.measurement = { type: MeasurementType.Square };
        break;
      default:
        if (itemId.startsWith('measure-cone-')) {
          this.activeLayer = MapLayerType.Measurement;
          this.measurement = {
            type: MeasurementType.Cone,
            coneAngle: parseInt(itemId.replace('measure-cone-', ''), 10)
          };
        } else if (itemId.startsWith('measure-beam-')) {
          this.activeLayer = MapLayerType.Measurement;
          this.measurement = {
            type: MeasurementType.Beam,
            beamWidth: parseInt(itemId.replace('measure-beam-', ''), 10)
          };
        }
    }
  }

  #startTemporaryDrawing(color: string, effectType?: AnnotationEffect) {
    const presence = this.#options.session.presence;
    if (!presence) return;

    // Continue on the existing layer when the same color is picked again
    const existing = this.currentTemporaryLayerId
      ? this.#temporaryLayers().find((l) => l.id === this.currentTemporaryLayerId && l.color === color && !effectType)
      : null;

    if (!existing) {
      this.currentTemporaryLayerId = uuidv4();
      presence.broadcastTemporaryLayer(
        presence.createTemporaryLayer(this.currentTemporaryLayerId, color, '', { effectType })
      );
    }

    this.annotationsActiveLayer = this.currentTemporaryLayerId;
    this.activeLayer = MapLayerType.Annotation;
    this.lineWidth = 1.0;
    this.resetToNoneAfterDelay();
  }

  /** Stage callback: a fog stroke changed — commit the RLE to the doc, debounced. */
  onFogUpdate = () => {
    this.resetToNoneAfterDelay();
    if (this.#fogCommitTimer) clearTimeout(this.#fogCommitTimer);
    this.#fogCommitTimer = setTimeout(() => {
      this.#fogCommitTimer = null;
      this.#commitFog();
    }, FOG_COMMIT_DEBOUNCE_MS);
  };

  async #commitFog() {
    const { session, getStage } = this.#options;
    const stage = getStage();
    const sceneId = session.activeSceneId;
    if (!stage?.fogOfWar || !sceneId || !session.client) return;
    if (stage.fogOfWar.isDrawing()) return; // the next stroke end re-arms the commit

    try {
      const rle = await stage.fogOfWar.toRLE();
      if (rle && !stage.fogOfWar.isDrawing()) {
        session.client.write.setFogMask(sceneId, rle);
        devLog('play', `Committed fog mask (${rle.length} bytes) to doc`);
      }
    } catch (error) {
      devError('play', 'Failed to commit fog mask', error);
    }
  }

  /** Stage callback: an annotation stroke finished. */
  onAnnotationUpdate = (layerId: string, blob: Promise<Blob>, endPosition?: { x: number; y: number }) => {
    this.resetToNoneAfterDelay();

    blob.then(async (resolved) => {
      this.tempLayerUrls[layerId] = URL.createObjectURL(resolved);

      const presence = this.#options.session.presence;
      const stage = this.#options.getStage();
      const tempLayerId = this.currentTemporaryLayerId;
      if (!presence || !stage?.annotations || !tempLayerId) return;

      try {
        const current = this.#temporaryLayers().find((l) => l.id === tempLayerId);
        const rle = await stage.annotations.toRLE();
        if (rle && rle.length > 0) {
          presence.broadcastTemporaryLayer(
            presence.createTemporaryLayer(tempLayerId, current?.color ?? '#ffffff', uint8ToBase64(rle), {
              effectType: current?.effectType
            })
          );
          this.#loadedTempMasks.set(tempLayerId, uint8ToBase64(rle));
          if (endPosition) this.#pendingPersistPosition = endPosition;
        }
      } catch (error) {
        devError('play', 'Failed to broadcast temporary layer', error);
      }
    });
  };

  /** Persist the finished temporary drawing as a permanent annotation in the doc. */
  async persistCurrentDrawing() {
    const layerId = this.#persistButtonLayerId;
    const { session } = this.#options;
    const sceneId = session.activeSceneId;
    const snapshot = session.activeScene;
    this.dismissPersistButton();

    if (!layerId || !sceneId || !snapshot || !session.client) return;
    const tempLayer = this.#temporaryLayers().find((l) => l.id === layerId);
    if (!tempLayer?.maskData) return;

    try {
      const mask = base64ToUint8(tempLayer.maskData);
      const minOrder = Math.min(1, ...snapshot.annotations.map((a) => a.order));
      const annotation: AnnotationRow = {
        id: uuidv4(),
        sceneId,
        name: tempLayer.effectType ? 'Player effect' : 'Player drawing',
        opacity: 1,
        color: tempLayer.color,
        url: null,
        visibility: StageMode.Player,
        order: minOrder - 1,
        effectType: tempLayer.effectType ?? null
      };

      session.client.write.upsertAnnotation(sceneId, annotation, mask);
      // Our own doc write is local-origin, so apply the mask to the new layer here
      await session.loadAnnotationMask(annotation.id, mask);

      session.presence?.removeTemporaryLayer(layerId);
      this.#loadedTempMasks.delete(layerId);
      if (this.currentTemporaryLayerId === layerId) this.currentTemporaryLayerId = null;
      devLog('play', 'Persisted drawing as annotation', annotation.id);
    } catch (error) {
      devError('play', 'Failed to persist drawing', error);
    }
  }

  dismissPersistButton() {
    if (this.#persistButtonTimer) {
      clearTimeout(this.#persistButtonTimer);
      this.#persistButtonTimer = null;
    }
    this.showPersistButton = false;
    this.#persistButtonLayerId = null;
  }

  #deleteAllDrawings() {
    const { session } = this.#options;
    const sceneId = session.activeSceneId;
    const snapshot = session.activeScene;
    if (!sceneId || !snapshot || !session.client) return;

    for (const annotation of snapshot.annotations) {
      session.client.write.deleteAnnotation(sceneId, annotation.id);
    }
    for (const layer of this.#temporaryLayers()) {
      session.presence?.removeTemporaryLayer(layer.id);
    }
    this.tempLayerUrls = {};
    this.#loadedTempMasks.clear();
    this.clearActiveTool();
    devLog('play', 'Deleted all drawings for scene', sceneId);
  }

  async #loadTempMaskWithRetry(layerId: string, maskData: string, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      try {
        const stage = this.#options.getStage();
        if (stage?.annotations?.loadMask) {
          await stage.annotations.loadMask(layerId, base64ToUint8(maskData));
          return;
        }
      } catch {
        // Layer component may not exist yet; retry
      }
    }
    devLog('play', `Failed to load temporary layer mask ${layerId} after ${retries} attempts`);
  }

  destroy() {
    clearInterval(this.#expiryTicker);
    if (this.#resetLayerTimer) clearTimeout(this.#resetLayerTimer);
    if (this.#persistButtonTimer) clearTimeout(this.#persistButtonTimer);
    if (this.#fogCommitTimer) clearTimeout(this.#fogCommitTimer);
  }
}
