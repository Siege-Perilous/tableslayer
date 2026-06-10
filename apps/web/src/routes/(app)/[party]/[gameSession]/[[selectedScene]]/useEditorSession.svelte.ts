import { browser } from '$app/environment';
import { SessionDocClient, type SceneChange } from '$lib/realtime';
import { devError, devLog } from '$lib/utils/debug';
import type { StageExports } from '@tableslayer/stage';

const THUMBNAIL_IDLE_MS = 10000;

export interface EditorSessionOptions {
  partyId: string;
  gameSessionId: string;
  userId: string;
  partykitHost: string;
  selectedSceneId: () => string | undefined;
  getStage: () => StageExports | undefined;
  /** Uploads a generated thumbnail and returns its versioned location. */
  uploadThumbnail: (blob: Blob, sceneId: string, currentUrl: string | null) => Promise<{ location: string } | null>;
}

/**
 * The editor's connection to the live session. Owns the SessionDocClient,
 * applies remote fog/annotation masks to the stage, and regenerates the scene
 * thumbnail after edits go idle. There is no save pipeline — every edit is
 * already in the doc and the PartyKit server persists.
 */
export class EditorSession {
  client: SessionDocClient | null = null;

  #options: EditorSessionOptions;
  #unsubChanges: (() => void) | null = null;
  #thumbnailTimers = new Map<string, ReturnType<typeof setTimeout>>();
  #thumbnailInFlight = new Set<string>();

  constructor(options: EditorSessionOptions) {
    this.#options = options;
    if (!browser) return;

    this.client = new SessionDocClient({
      partykitHost: options.partykitHost,
      partyId: options.partyId,
      gameSessionId: options.gameSessionId,
      userId: options.userId
    });
    this.#unsubChanges = this.client.onChanges((changes) => this.#handleChanges(changes));
  }

  get presence() {
    return this.client?.presence ?? null;
  }

  get ready(): boolean {
    return this.client?.ready ?? false;
  }

  /**
   * Apply a scene's fog + annotation masks from the doc to the stage. Retries on
   * a short schedule: the fog layer refills itself when the map texture loads,
   * and annotation layer components must mount before loadMask can land.
   */
  async applyMasks(sceneId: string) {
    for (const delay of [0, 300, 1000, 3000]) {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      if (this.#options.selectedSceneId() !== sceneId) return; // scene changed mid-retry
      await this.#applyMasksOnce(sceneId);
    }
  }

  async #applyMasksOnce(sceneId: string) {
    const client = this.client;
    const stage = this.#options.getStage();
    if (!client || !stage) return;

    try {
      const fogMask = client.fogMask(sceneId);
      if (fogMask && stage.fogOfWar?.fromRLE && !stage.fogOfWar.isDrawing()) {
        await stage.fogOfWar.fromRLE(fogMask, 1024, 1024);
      }
      for (const annotation of client.scene(sceneId)?.annotations ?? []) {
        const mask = client.annotationMask(sceneId, annotation.id);
        if (mask && stage.annotations?.loadMask && !stage.annotations.isDrawing()) {
          await stage.annotations.loadMask(annotation.id, mask);
        }
      }
    } catch (error) {
      devError('editor', 'Failed to apply masks', error);
    }
  }

  #handleChanges(changes: SceneChange[]) {
    const selectedSceneId = this.#options.selectedSceneId();
    const client = this.client;
    if (!client) return;

    for (const change of changes) {
      if (change.part === 'scenes') continue;

      // Local edits to a scene schedule a thumbnail refresh after edits go idle
      if (!change.remote && (change.part === 'settings' ? !change.keys.includes('mapThumbLocation') : true)) {
        this.#scheduleThumbnail(change.sceneId);
      }

      if (!change.remote || change.sceneId !== selectedSceneId) continue;

      // Remote mask changes apply straight to the canvas (own commits are
      // excluded by transaction identity, not timing)
      const stage = this.#options.getStage();
      if (!stage) continue;
      if (change.part === 'fogMask' && !stage.fogOfWar?.isDrawing()) {
        const mask = client.fogMask(change.sceneId);
        if (mask) stage.fogOfWar.fromRLE(mask, 1024, 1024);
      }
      if (change.part === 'annotations' && change.childId && change.keys.includes('mask')) {
        if (!stage.annotations?.isDrawing()) {
          const mask = client.annotationMask(change.sceneId, change.childId);
          if (mask) stage.annotations.loadMask(change.childId, mask);
        }
      }
    }
  }

  #scheduleThumbnail(sceneId: string) {
    const existing = this.#thumbnailTimers.get(sceneId);
    if (existing) clearTimeout(existing);
    this.#thumbnailTimers.set(
      sceneId,
      setTimeout(() => {
        this.#thumbnailTimers.delete(sceneId);
        this.#captureThumbnail(sceneId);
      }, THUMBNAIL_IDLE_MS)
    );
  }

  async #captureThumbnail(sceneId: string) {
    const client = this.client;
    const stage = this.#options.getStage();
    // Only the currently displayed scene can be captured
    if (!client || !stage?.scene?.generateThumbnail || this.#options.selectedSceneId() !== sceneId) return;
    if (this.#thumbnailInFlight.has(sceneId)) return;

    this.#thumbnailInFlight.add(sceneId);
    try {
      const blob = await stage.scene.generateThumbnail();
      const currentUrl = client.scene(sceneId)?.settings.mapThumbLocation ?? null;
      const result = await this.#options.uploadThumbnail(blob, sceneId, currentUrl);
      if (result?.location) {
        client.write.setSceneSettings(sceneId, { mapThumbLocation: result.location });
        devLog('editor', `Updated scene thumbnail: ${result.location}`);
      }
    } catch (error) {
      devError('editor', 'Thumbnail capture failed', error);
    } finally {
      this.#thumbnailInFlight.delete(sceneId);
    }
  }

  destroy() {
    for (const timer of this.#thumbnailTimers.values()) clearTimeout(timer);
    this.#thumbnailTimers.clear();
    this.#unsubChanges?.();
    this.client?.destroy();
    this.client = null;
  }
}
