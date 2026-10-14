import type { Connection, ConnectionContext } from 'partyserver';
import { YServer } from 'y-partyserver';
import * as Y from 'yjs';
import { classifySceneEvents, getScenesMap, hydrateGameSessionDoc, isDocHydrated } from '../src/lib/realtime/docSchema';
import type { ScenePart } from '../src/lib/realtime/types';
import {
  hydrationDataFromWire,
  sceneWireFromDoc,
  type PersistSessionWire,
  type SessionSnapshotWire
} from '../src/lib/realtime/wire';
import { appRequest, internalToken } from './appApi';
import { readDirtySet, readDocSnapshot, writeDirtySet, writeDocSnapshot } from './docSnapshot';
import { createRoomActivityReporter } from './roomActivity';

const ALL_PARTS: ScenePart[] = ['settings', 'markers', 'lights', 'annotations', 'fogMask'];
const HYDRATION_ORIGIN = 'server-hydration';
const SNAPSHOT_ORIGIN = 'server-snapshot';
const PERSIST_RETRY_MS = 15000;
const PERSIST_RETRY_MAX_MS = 15 * 60 * 1000;
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface DirtyWire {
  scenes: [string, ScenePart[]][];
  deleted: string[];
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

/**
 * Authoritative home of a game session's live document. The room hydrates its Y doc
 * from the database on first use and is the ONLY writer of scene data back to the
 * database (debounced, dirty-scenes-only). Clients never save scene state.
 *
 * Change attribution: client edits arrive as applied updates (transaction.local ===
 * false) while this server's own hydration runs in a local transaction — so the
 * dirty tracker keys off `remote` and hydration never echoes back into a DB write.
 *
 * Hibernation: in-memory state here resets whenever the Durable Object hibernates,
 * which can only happen once every timer and in-flight request has settled, i.e.
 * after the debounced save below has flushed. The doc itself is restored from the
 * storage snapshot in onLoad, and any dirty set left in storage is persisted by alarm.
 */
export class GameSessionServer extends YServer {
  static options = { hibernate: true };
  static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 };

  #dirty = new Map<string, Set<ScenePart>>();
  #deletedSceneIds = new Set<string>();
  #observing = false;
  #persisting = false;
  #hydration: Promise<void> | null = null;
  #retryAttempt = 0;
  #activity = createRoomActivityReporter(
    { name: () => this.name, env: this.env, connections: () => [...this.getConnections()].length },
    'game_session'
  );

  // Diagnostics surfaced via the `debug` room command (since the last wake)
  #stats = { flushes: 0, persistAttempts: 0, persistOk: 0, persistFail: 0, lastError: '' };

  // Runs inside blockConcurrencyWhile: local storage only, never the network
  async onLoad() {
    try {
      const snapshot = await readDocSnapshot(this.ctx.storage, SNAPSHOT_MAX_AGE_MS);
      if (snapshot) Y.applyUpdate(this.document, snapshot.update, SNAPSHOT_ORIGIN);
    } catch (error) {
      console.error(`snapshot restore failed for game session ${this.name}`, error);
    }
  }

  async onStart() {
    await super.onStart();
    // Attach after the snapshot restore: applyUpdate runs as a non-local
    // transaction and would otherwise mark every scene dirty on each wake
    this.#observeScenes();
    await this.#restoreDirtySet();
    if (!isDocHydrated(this.document)) void this.#ensureHydrated();
  }

  #observeScenes() {
    if (this.#observing) return;
    this.#observing = true;
    const doc = this.document;
    getScenesMap(doc).observeDeep((events, transaction) => {
      for (const change of classifySceneEvents(events as Y.YEvent<Y.Map<unknown>>[], transaction)) {
        if (!change.remote) continue;
        if (change.part === 'scenes') {
          for (const sceneId of change.keys) {
            if (getScenesMap(doc).has(sceneId)) {
              this.#markDirty(sceneId, ALL_PARTS);
            } else {
              this.#dirty.delete(sceneId);
              this.#deletedSceneIds.add(sceneId);
            }
          }
        } else {
          this.#markDirty(change.sceneId, [change.part]);
        }
      }
    });
  }

  #markDirty(sceneId: string, parts: Iterable<ScenePart>) {
    let set = this.#dirty.get(sceneId);
    if (!set) {
      set = new Set();
      this.#dirty.set(sceneId, set);
    }
    for (const part of parts) set.add(part);
  }

  #dirtyWire(): DirtyWire {
    return {
      scenes: [...this.#dirty].map(([sceneId, parts]) => [sceneId, [...parts]]),
      deleted: [...this.#deletedSceneIds]
    };
  }

  // Edits that were dirty when the previous instance died are still owed to the DB
  async #restoreDirtySet() {
    try {
      const stored = await readDirtySet<DirtyWire>(this.ctx.storage);
      if (!stored || (stored.scenes.length === 0 && stored.deleted.length === 0)) return;
      for (const [sceneId, parts] of stored.scenes) this.#markDirty(sceneId, parts);
      for (const sceneId of stored.deleted) this.#deletedSceneIds.add(sceneId);
      await this.ctx.storage.setAlarm(Date.now());
    } catch (error) {
      console.error(`dirty set restore failed for game session ${this.name}`, error);
    }
  }

  // A failed hydration must not kill the websocket: keep the connection open, let
  // clients wait on the ready gate, and retry by alarm.
  #ensureHydrated(): Promise<void> {
    if (!this.#hydration) {
      this.#hydration = this.#hydrate()
        .catch((error) => {
          console.error(`hydration failed for game session ${this.name}; retrying`, error);
          this.#scheduleRetry();
        })
        .finally(() => {
          this.#hydration = null;
        });
    }
    return this.#hydration;
  }

  async #hydrate() {
    if (isDocHydrated(this.document)) return;
    const snapshot = await appRequest<SessionSnapshotWire>(this.env, '/api/internal/sessionSnapshot', {
      gameSessionId: this.name
    });
    // Re-check: a reconnecting client's sync may have hydrated the doc while we awaited
    if (!isDocHydrated(this.document)) {
      hydrateGameSessionDoc(this.document, hydrationDataFromWire(snapshot), HYDRATION_ORIGIN);
    }
    this.#retryAttempt = 0;
  }

  // Alarms outlive the instance, so back off: a room whose app call keeps failing
  // settles at one wake every 15 minutes instead of every 15 seconds forever
  #scheduleRetry() {
    const delay = Math.min(PERSIST_RETRY_MS * 2 ** this.#retryAttempt, PERSIST_RETRY_MAX_MS);
    this.#retryAttempt++;
    this.ctx.storage.setAlarm(Date.now() + delay).catch((error) => {
      console.error(`failed to schedule retry for game session ${this.name}`, error);
    });
  }

  async onAlarm() {
    if (!isDocHydrated(this.document)) await this.#ensureHydrated();
    await this.#persistDirty();
  }

  // Debounced by y-partyserver (callbackOptions) after doc updates
  async onSave() {
    this.#stats.flushes++;
    try {
      await writeDocSnapshot(this.ctx.storage, this.document, this.#dirtyWire());
    } catch (error) {
      console.error(`snapshot write failed for game session ${this.name}`, error);
    }
    await this.#persistDirty();
  }

  async #persistDirty() {
    if (this.#persisting) return;
    if (this.#dirty.size === 0 && this.#deletedSceneIds.size === 0) return;

    this.#persisting = true;
    this.#stats.persistAttempts++;
    const dirty = this.#dirty;
    const deleted = this.#deletedSceneIds;
    this.#dirty = new Map();
    this.#deletedSceneIds = new Set();

    try {
      const payload: PersistSessionWire = {
        gameSessionId: this.name,
        scenes: [...dirty]
          .map(([sceneId, parts]) => sceneWireFromDoc(this.document, sceneId, [...parts]))
          .filter((scene): scene is NonNullable<typeof scene> => scene !== null),
        deletedSceneIds: [...deleted]
      };
      await appRequest(this.env, '/api/internal/persistSession', payload);
      this.#stats.persistOk++;
      this.#retryAttempt = 0;
      await writeDirtySet(this.ctx.storage, this.#dirtyWire());
    } catch (error) {
      this.#stats.persistFail++;
      this.#stats.lastError = error instanceof Error ? `${error.message}` : String(error);
      // Merge back what we drained and retry; the doc itself is safe in the
      // storage snapshot regardless.
      for (const [sceneId, parts] of dirty) this.#markDirty(sceneId, parts);
      for (const sceneId of deleted) this.#deletedSceneIds.add(sceneId);
      console.error(`persistSession failed for ${this.name}; retrying`, error);
      this.#scheduleRetry();
    } finally {
      this.#persisting = false;
    }
  }

  async onConnect(conn: Connection, ctx: ConnectionContext) {
    // The connection count already includes this socket (PartyServer accepts before
    // calling us); queueing is synchronous and never touches the network here.
    this.#activity.queue('connect', conn);
    if (!isDocHydrated(this.document)) void this.#ensureHydrated();
    await super.onConnect(conn, ctx);
  }

  async onClose(conn: Connection, code: number, reason: string, wasClean: boolean) {
    await super.onClose(conn, code, reason, wasClean);
    // The closing socket is already gone from the count
    this.#activity.queue('close', conn);
    if ([...this.getConnections()].length === 0) {
      // Flush the final close row alongside the persist so it lands before eviction
      await Promise.all([this.onSave(), this.#activity.flush()]);
    }
  }

  #authorized(req: Request) {
    return req.headers.get('x-internal-token') === internalToken(this.env);
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.method !== 'POST') return new Response('OK', { status: 200 });
    const body = (await req.json()) as { type?: string; timestamp?: number };

    // Diagnostics: expose persister state without needing terminal access
    if (body.type === 'debug') {
      if (!this.#authorized(req)) return new Response('Unauthorized', { status: 401 });
      return json({
        hydrated: isDocHydrated(this.document),
        hydrating: this.#hydration !== null,
        persisting: this.#persisting,
        connections: [...this.getConnections()].length,
        dirty: [...this.#dirty.entries()].map(([sceneId, parts]) => [sceneId.slice(0, 8), [...parts]]),
        deleted: [...this.#deletedSceneIds],
        retryAttempt: this.#retryAttempt,
        stats: this.#stats
      });
    }

    // After the app writes session data to the DB directly (import, admin tools),
    // it calls this to rebuild the live doc from the database.
    if (body.type === 'resync') {
      if (!this.#authorized(req)) return new Response('Unauthorized', { status: 401 });
      if (this.#hydration) await this.#hydration;
      const snapshot = await appRequest<SessionSnapshotWire>(this.env, '/api/internal/sessionSnapshot', {
        gameSessionId: this.name
      });
      this.document.transact(() => {
        const scenes = getScenesMap(this.document);
        for (const sceneId of [...scenes.keys()]) scenes.delete(sceneId);
      }, HYDRATION_ORIGIN);
      hydrateGameSessionDoc(this.document, hydrationDataFromWire(snapshot), HYDRATION_ORIGIN);
      // The resynced doc now matches the DB; drop any stale dirty state
      this.#dirty.clear();
      this.#deletedSceneIds.clear();
      return json({ ok: true });
    }

    if (body.type === 'ping') {
      return json({ type: 'pong', timestamp: body.timestamp, serverTimestamp: Date.now(), roomId: this.name });
    }

    return new Response('OK', { status: 200 });
  }
}
