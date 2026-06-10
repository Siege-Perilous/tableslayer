import YPartyKitProvider from 'y-partykit/provider';
import * as Y from 'yjs';
import {
  classifySceneEvents,
  createPartyWriter,
  createSessionWriter,
  getAnnotationMask,
  getFogMask,
  getPartyState,
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

  readonly write: SessionWriter;
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

  #sceneRevs = $state<Record<string, number>>({});
  #listRev = $state(0);
  #partyRev = $state(0);

  #snapshotCache = new Map<string, { rev: number; snapshot: SceneSnapshot }>();
  #listCache: { rev: number; list: SceneListEntry[] } | null = null;
  #partyCache: { rev: number; state: PartyState } | null = null;
  #changeListeners = new Set<(changes: SceneChange[]) => void>();

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

  #applyChanges(changes: SceneChange[]) {
    for (const change of changes) {
      if (change.part === 'scenes') {
        this.#listRev++;
        for (const sceneId of change.keys) {
          this.#sceneRevs[sceneId] = (this.#sceneRevs[sceneId] ?? 0) + 1;
        }
      } else {
        this.#sceneRevs[change.sceneId] = (this.#sceneRevs[change.sceneId] ?? 0) + 1;
        // The scene list mirrors a few settings fields (name, order, thumbnails)
        if (change.part === 'settings') this.#listRev++;
      }
    }
    if (changes.length > 0) {
      this.#changeListeners.forEach((listener) => listener(changes));
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
    this.presence.destroy();
    this.#changeListeners.clear();
    this.#gameSessionProvider.destroy();
    this.#partyProvider.destroy();
    this.doc.destroy();
    this.partyDoc.destroy();
  }
}
