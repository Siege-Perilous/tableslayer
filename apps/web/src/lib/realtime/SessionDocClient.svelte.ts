import { createCadenceTracker } from '$lib/utils/syncLog';
import YPartyKitProvider from 'y-partykit/provider';
import * as Y from 'yjs';
import {
  classifySceneEvents,
  createPartyWriter,
  createSessionWriter,
  getAnnotationMask,
  getFogMask,
  getPartyState,
  getScenesMap,
  getSceneSnapshot,
  isDocHydrated,
  listScenes,
  type PartyWriter,
  type SessionWriter
} from './docSchema';
import { PresenceChannel } from './presence.svelte';
import type { PartyState, SceneChange, SceneListEntry, SceneSnapshot } from './types';

export interface SessionDocClientOptions {
  partykitHost: string;
  partyId: string;
  gameSessionId: string;
  userId: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * The single client-side entry point to a game session's shared state.
 *
 * Owns the two Y docs (game session + party), their PartyKit providers, and the
 * presence channel. Exposes shared state through reactive snapshot reads — pages
 * derive render props from `scene()`/`scenes()`/`partyState()` and never touch Y
 * types. All writes go through `write`/`party`, tagged with this client's origin,
 * so observers can tell local from remote changes exactly.
 *
 * There is no client-side persistence here by design: the PartyKit server is the
 * only writer to the database.
 */
export class SessionDocClient {
  readonly doc = new Y.Doc();
  readonly partyDoc = new Y.Doc();
  /** Identity tag for this client's transactions. */
  readonly origin: object = { client: 'SessionDocClient' };
  /** Origin for system writes (thumbnails etc.) — excluded from undo tracking. */
  readonly systemOrigin: object = { client: 'SessionDocClient', system: true };

  readonly write: SessionWriter;
  /** Writer for system-initiated changes that must never land on the undo stack. */
  readonly systemWrite: SessionWriter;
  readonly party: PartyWriter;
  readonly presence: PresenceChannel;
  readonly gameSessionId: string;
  readonly partyId: string;
  readonly userId: string;

  status = $state<{ gameSession: ConnectionState; party: ConnectionState }>({
    gameSession: 'connecting',
    party: 'connecting'
  });
  /** True once both rooms have synced and the server has hydrated the session doc. */
  ready = $state(false);
  canUndo = $state(false);
  canRedo = $state(false);

  #sceneRevs = $state<Record<string, number>>({});
  #listRev = $state(0);
  #partyRev = $state(0);

  #snapshotCache = new Map<string, { rev: number; snapshot: SceneSnapshot }>();
  #listCache: { rev: number; list: SceneListEntry[] } | null = null;
  #partyCache: { rev: number; state: PartyState } | null = null;
  #changeListeners = new Set<(changes: SceneChange[]) => void>();

  #undoManager: Y.UndoManager | null = null;
  #gameSessionProvider: YPartyKitProvider;
  #partyProvider: YPartyKitProvider;
  #gameSessionSynced = false;
  #partySynced = false;
  #readyResolvers: Array<() => void> = [];

  constructor(options: SessionDocClientOptions) {
    this.partyId = options.partyId;
    this.gameSessionId = options.gameSessionId;
    this.userId = options.userId;

    this.write = createSessionWriter(this.doc, this.origin);
    this.systemWrite = createSessionWriter(this.doc, this.systemOrigin);
    this.party = createPartyWriter(this.partyDoc, this.origin);

    this.#gameSessionProvider = new YPartyKitProvider(options.partykitHost, options.gameSessionId, this.doc, {
      party: 'game_session',
      params: { userId: options.userId }
    });
    this.#partyProvider = new YPartyKitProvider(options.partykitHost, options.partyId, this.partyDoc, {
      party: 'party',
      params: { userId: options.userId }
    });

    this.presence = new PresenceChannel(this.#gameSessionProvider.awareness, options.userId);

    this.#gameSessionProvider.on('status', (event: { status: string }) => {
      this.status.gameSession = event.status === 'connected' ? 'connected' : 'connecting';
    });
    this.#partyProvider.on('status', (event: { status: string }) => {
      this.status.party = event.status === 'connected' ? 'connected' : 'connecting';
    });
    this.#gameSessionProvider.on('sync', (synced: boolean) => {
      this.#gameSessionSynced = synced;
      this.#checkReady();
    });
    this.#partyProvider.on('sync', (synced: boolean) => {
      this.#partySynced = synced;
      this.#checkReady();
    });

    this.doc.getMap('scenes').observeDeep((events, transaction) => {
      const changes = classifySceneEvents(events as Y.YEvent<Y.Map<unknown>>[], transaction);
      this.#applyChanges(changes);
    });
    // Hydration arrives as a meta update; re-check readiness when it lands.
    this.doc.getMap('meta').observe(() => this.#checkReady());
    this.partyDoc.getMap('meta').observe(() => this.#checkReady());
    this.partyDoc.getMap('state').observe(() => {
      this.#partyRev++;
    });
  }

  // Remote peers can produce doc updates faster than this client processes
  // them (e.g. another editor panning the map), and websocket/BroadcastChannel
  // messages — unlike input events — are never coalesced by the browser.
  // Bumping revs per message would run the full snapshot -> StageProps rebuild
  // once per message and fall behind under backlog, replaying stale positions
  // in slow motion. Remote bumps therefore coalesce through a setTimeout(0)
  // macrotask: it runs after every message already sitting in the task queue,
  // so a backlog drains into ONE rebuild from the latest doc state, while
  // steady sub-rate streams still rebuild promptly per batch. Deliberately NOT
  // requestAnimationFrame: rAF cadence is per-window (focus, occlusion, GPU
  // contention) and would chain the receive pipeline to this window's
  // rendering health — an unfocused editor would receive gestures as chunks.
  // Local writes keep synchronous bumps so same-tick read-after-write stays
  // exact. #changeListeners still fire per transaction.
  #pendingSceneRevs = new Set<string>();
  #pendingListRev = false;
  #revFlushTimer: ReturnType<typeof setTimeout> | null = null;

  #recvLog = createCadenceTracker('recv-remote');
  #revFlushLog = createCadenceTracker('recv-revflush');

  #applyChanges(changes: SceneChange[]) {
    let sawRemote = false;
    for (const change of changes) {
      const sceneIds = change.part === 'scenes' ? change.keys : [change.sceneId];
      // The scene list mirrors a few settings fields (name, order, thumbnails)
      const touchesList = change.part === 'scenes' || change.part === 'settings';
      if (change.remote) {
        sawRemote = true;
        for (const sceneId of sceneIds) this.#pendingSceneRevs.add(sceneId);
        this.#pendingListRev ||= touchesList;
        this.#scheduleRevFlush();
      } else {
        for (const sceneId of sceneIds) {
          this.#sceneRevs[sceneId] = (this.#sceneRevs[sceneId] ?? 0) + 1;
        }
        if (touchesList) this.#listRev++;
      }
    }
    if (sawRemote) {
      this.#recvLog.record(`parts=${changes.map((c) => c.part).join(',')}`);
    }
    if (changes.length > 0) {
      this.#changeListeners.forEach((listener) => listener(changes));
    }
  }

  #scheduleRevFlush() {
    if (this.#revFlushTimer !== null) return;
    this.#revFlushTimer = setTimeout(() => this.#flushPendingRevs(), 0);
  }

  #cancelRevFlush() {
    if (this.#revFlushTimer !== null) clearTimeout(this.#revFlushTimer);
    this.#revFlushTimer = null;
  }

  #flushPendingRevs() {
    this.#cancelRevFlush();
    this.#revFlushLog.record(`scenes=${this.#pendingSceneRevs.size}`);
    for (const sceneId of this.#pendingSceneRevs) {
      this.#sceneRevs[sceneId] = (this.#sceneRevs[sceneId] ?? 0) + 1;
    }
    this.#pendingSceneRevs.clear();
    if (this.#pendingListRev) {
      this.#pendingListRev = false;
      this.#listRev++;
    }
  }

  #checkReady() {
    const ready =
      this.#gameSessionSynced && this.#partySynced && isDocHydrated(this.doc) && isDocHydrated(this.partyDoc);
    if (ready && !this.ready) {
      this.ready = true;
      this.#readyResolvers.forEach((resolve) => resolve());
      this.#readyResolvers = [];
    }
  }

  /** Resolves once both rooms are synced and the session doc is hydrated. */
  whenReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve) => this.#readyResolvers.push(resolve));
  }

  // -------------------------------------------------------------------------
  // Reactive reads — establish a rune dependency, then serve memoized snapshots
  // -------------------------------------------------------------------------

  scenes(): SceneListEntry[] {
    const rev = this.#listRev;
    if (this.#listCache?.rev !== rev) {
      this.#listCache = { rev, list: listScenes(this.doc) };
    }
    return this.#listCache.list;
  }

  scene(sceneId: string): SceneSnapshot | null {
    const rev = this.#sceneRevs[sceneId] ?? 0;
    const cached = this.#snapshotCache.get(sceneId);
    if (cached?.rev === rev) return cached.snapshot;

    const snapshot = getSceneSnapshot(this.doc, sceneId);
    if (snapshot) this.#snapshotCache.set(sceneId, { rev, snapshot });
    else this.#snapshotCache.delete(sceneId);
    return snapshot;
  }

  partyState(): PartyState {
    const rev = this.#partyRev;
    if (this.#partyCache?.rev !== rev) {
      this.#partyCache = { rev, state: getPartyState(this.partyDoc) };
    }
    return this.#partyCache.state;
  }

  // -------------------------------------------------------------------------
  // Undo/redo — a per-scene Y.UndoManager tracking only this client's origin,
  // so undo reverts your own edits and never another collaborator's. Each undo
  // stack item can pin prior mask bytes against GC, hence the stack cap.
  // -------------------------------------------------------------------------

  static readonly #UNDO_STACK_LIMIT = 100;

  /** Scope undo history to one scene (or null to disable). Clears prior history. */
  setUndoScope(sceneId: string | null) {
    this.#undoManager?.destroy();
    this.#undoManager = null;
    this.canUndo = false;
    this.canRedo = false;
    if (!sceneId) return;

    const scene = getScenesMap(this.doc).get(sceneId);
    if (!scene) {
      console.warn(`[realtime] undo scope dropped — scene ${sceneId} not in doc`);
      return;
    }

    const undoManager = new Y.UndoManager(scene, {
      trackedOrigins: new Set([this.origin])
    });
    const refresh = () => {
      if (undoManager.undoStack.length > SessionDocClient.#UNDO_STACK_LIMIT) {
        undoManager.undoStack.splice(0, undoManager.undoStack.length - SessionDocClient.#UNDO_STACK_LIMIT);
      }
      this.canUndo = undoManager.canUndo();
      this.canRedo = undoManager.canRedo();
    };
    undoManager.on('stack-item-added', refresh);
    undoManager.on('stack-item-popped', refresh);
    undoManager.on('stack-cleared', refresh);
    this.#undoManager = undoManager;
  }

  undo() {
    this.#undoManager?.undo();
  }

  redo() {
    this.#undoManager?.redo();
  }

  /** Close the current capture group so the next edit starts a new undo step. */
  stopCapturing() {
    this.#undoManager?.stopCapturing();
  }

  // -------------------------------------------------------------------------
  // Imperative reads + change subscription (for canvas mask application etc.)
  // -------------------------------------------------------------------------

  fogMask(sceneId: string): Uint8Array | null {
    return getFogMask(this.doc, sceneId);
  }

  annotationMask(sceneId: string, annotationId: string): Uint8Array | null {
    return getAnnotationMask(this.doc, sceneId, annotationId);
  }

  /**
   * Subscribe to classified doc changes. `change.remote` is exact (transaction
   * identity, not timing) — use it to skip re-applying your own mask commits.
   */
  onChanges(listener: (changes: SceneChange[]) => void): () => void {
    this.#changeListeners.add(listener);
    return () => this.#changeListeners.delete(listener);
  }

  destroy() {
    this.#cancelRevFlush();
    this.#undoManager?.destroy();
    this.#undoManager = null;
    this.presence.destroy();
    this.#changeListeners.clear();
    this.#gameSessionProvider.destroy();
    this.#partyProvider.destroy();
    this.doc.destroy();
    this.partyDoc.destroy();
  }
}
