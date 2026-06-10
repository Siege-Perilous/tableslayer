import { browser } from '$app/environment';
import { SessionDocClient, type SceneChange, type SceneSnapshot } from '$lib/realtime';
import { devError, devLog } from '$lib/utils/debug';
import { generateLargeImageUrl } from '$lib/utils/generateR2Url';
import type { StageExports } from '@tableslayer/stage';

export interface SessionRoute {
  id: string;
  name: string;
  scenes: Array<{ id: string; name: string }>;
}

export interface PlaySessionOptions {
  partyId: string;
  userId: string;
  partykitHost: string;
  initialGameSessionId?: string;
  initialActiveSceneId?: string | null;
  initialIsPaused: boolean;
  bucketUrl?: string;
  /** Scene → session routing (from SSR) for cross-session scene switches. */
  routes: () => SessionRoute[];
  getStage: () => StageExports | undefined;
}

/**
 * The play route's connection to the live session: owns the SessionDocClient,
 * follows the party's active scene across game session rooms, applies remote
 * fog/annotation masks to the stage, and preloads sibling scene map images so
 * scene switches are texture-swap fast. No SSR reloads, no DB fetches.
 */
export class PlaySession {
  client = $state<SessionDocClient | null>(null);
  gameSessionId = $state<string | undefined>(undefined);

  #options: PlaySessionOptions;
  #lastActiveSceneId = $state<string | null>(null);
  #unsubChanges: (() => void) | null = null;
  #preloadedMaps = new Set<string>();

  constructor(options: PlaySessionOptions) {
    this.#options = options;
    this.#lastActiveSceneId = options.initialActiveSceneId ?? null;
    if (options.initialGameSessionId) {
      this.#connect(options.initialGameSessionId);
    }

    // Follow the active scene across game sessions: when the active scene lives
    // in a different session's room, reconnect there.
    $effect(() => {
      const sceneId = this.activeSceneId;
      if (!sceneId || !this.client?.ready) return;
      const targetSession = this.#sessionForScene(sceneId);
      if (targetSession && targetSession !== this.gameSessionId) {
        devLog('play', `Active scene ${sceneId} lives in session ${targetSession}; reconnecting`);
        this.#connect(targetSession);
      }
    });

    // Remember the last known active scene so the UI stays stable across reconnects
    $effect(() => {
      const id = this.client?.ready ? this.client.partyState().activeSceneId : null;
      if (id) this.#lastActiveSceneId = id;
    });

    // Preload sibling scene maps for instant switches
    $effect(() => {
      if (!this.client?.ready) return;
      for (const scene of this.client.scenes()) {
        if (!scene.mapLocation || scene.id === this.activeSceneId) continue;
        if (this.#preloadedMaps.has(scene.mapLocation)) continue;
        this.#preloadedMaps.add(scene.mapLocation);
        const image = new Image();
        image.src = generateLargeImageUrl(scene.mapLocation, this.#options.bucketUrl);
      }
    });
  }

  #connect(gameSessionId: string) {
    if (!browser) return;
    this.#unsubChanges?.();
    this.client?.destroy();
    this.gameSessionId = gameSessionId;
    this.client = new SessionDocClient({
      partykitHost: this.#options.partykitHost,
      partyId: this.#options.partyId,
      gameSessionId,
      userId: this.#options.userId
    });
    this.#unsubChanges = this.client.onChanges((changes) => this.#applyRemoteMaskChanges(changes));
  }

  #sessionForScene(sceneId: string): string | undefined {
    if (this.client?.scenes().some((scene) => scene.id === sceneId)) return this.gameSessionId;
    return this.#options.routes().find((route) => route.scenes.some((scene) => scene.id === sceneId))?.id;
  }

  get ready(): boolean {
    return this.client?.ready ?? false;
  }

  get presence() {
    return this.client?.presence ?? null;
  }

  get activeSceneId(): string | null {
    if (this.client?.ready) {
      return this.client.partyState().activeSceneId ?? null;
    }
    return this.#lastActiveSceneId;
  }

  get activeScene(): SceneSnapshot | null {
    const sceneId = this.activeSceneId;
    if (!sceneId || !this.client?.ready) return null;
    return this.client.scene(sceneId);
  }

  get isPaused(): boolean {
    if (this.client?.ready) return this.client.partyState().isPaused;
    return this.#options.initialIsPaused;
  }

  /** Set the party's active scene; reconnects first if it lives in another session. */
  async switchScene(sceneId: string) {
    this.#lastActiveSceneId = sceneId;
    const targetSession = this.#sessionForScene(sceneId);
    if (targetSession && targetSession !== this.gameSessionId) {
      this.#connect(targetSession);
    }
    await this.client?.whenReady();
    this.client?.party.setActiveScene(sceneId);
  }

  /**
   * Apply the active scene's fog + annotation masks from the doc to the stage.
   * Retries on a short schedule: the fog layer refills itself when the map
   * texture finishes loading, and annotation layer components must mount before
   * loadMask can land. Re-applying authoritative doc state is idempotent.
   */
  async applyMasks() {
    const sceneId = this.activeSceneId;
    for (const delay of [0, 300, 1000, 3000]) {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      if (this.activeSceneId !== sceneId) return; // scene changed mid-retry
      await this.#applyMasksOnce(sceneId);
    }
  }

  async #applyMasksOnce(sceneId: string | null) {
    const client = this.client;
    const stage = this.#options.getStage();
    if (!sceneId || !client || !stage) return;

    try {
      const fogMask = client.fogMask(sceneId);
      if (fogMask && stage.fogOfWar?.fromRLE && !stage.fogOfWar.isDrawing()) {
        await stage.fogOfWar.fromRLE(fogMask, 1024, 1024);
      }
      const snapshot = client.scene(sceneId);
      for (const annotation of snapshot?.annotations ?? []) {
        const mask = client.annotationMask(sceneId, annotation.id);
        if (mask && stage.annotations?.loadMask) {
          await stage.annotations.loadMask(annotation.id, mask);
        }
      }
    } catch (error) {
      devError('play', 'Failed to apply masks', error);
    }
  }

  async loadAnnotationMask(annotationId: string, mask: Uint8Array) {
    const stage = this.#options.getStage();
    if (!stage?.annotations?.loadMask) return;
    try {
      await stage.annotations.loadMask(annotationId, mask);
    } catch (error) {
      devError('play', `Failed to load annotation mask ${annotationId}`, error);
    }
  }

  #applyRemoteMaskChanges(changes: SceneChange[]) {
    const sceneId = this.activeSceneId;
    const client = this.client;
    const stage = this.#options.getStage();
    if (!sceneId || !client || !stage) return;

    for (const change of changes) {
      // `remote` is transaction identity, not timing — our own commits are skipped
      // exactly, with no echo windows.
      if (!change.remote || change.sceneId !== sceneId) continue;

      if (change.part === 'fogMask') {
        if (stage.fogOfWar?.isDrawing()) continue;
        const mask = client.fogMask(sceneId);
        if (mask) stage.fogOfWar.fromRLE(mask, 1024, 1024);
      }

      if (change.part === 'annotations' && change.childId && change.keys.includes('mask')) {
        const mask = client.annotationMask(sceneId, change.childId);
        if (mask) this.loadAnnotationMask(change.childId, mask);
      }
    }
  }

  destroy() {
    this.#unsubChanges?.();
    this.client?.destroy();
    this.client = null;
  }
}
