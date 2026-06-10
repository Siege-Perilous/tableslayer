import type * as Party from 'partykit/server';
import { onConnect, unstable_getYDoc, type YPartyKitOptions } from 'y-partykit';
import type * as Y from 'yjs';
import { classifySceneEvents, getScenesMap, hydrateGameSessionDoc, isDocHydrated } from '../src/lib/realtime/docSchema';
import type { ScenePart } from '../src/lib/realtime/types';
import {
  hydrationDataFromWire,
  sceneWireFromDoc,
  type PersistSessionWire,
  type SessionSnapshotWire
} from '../src/lib/realtime/wire';
import { appRequest } from './appApi';

const ALL_PARTS: ScenePart[] = ['settings', 'markers', 'lights', 'annotations', 'fogMask'];
const HYDRATION_ORIGIN = 'server-hydration';
const PERSIST_RETRY_MS = 15000;

/**
 * Authoritative home of a game session's live document. The room hydrates its Y doc
 * from the database on first use and is the ONLY writer of scene data back to the
 * database (debounced, dirty-scenes-only). Clients never save scene state.
 *
 * Change attribution: client edits arrive as applied updates (transaction.local ===
 * false) while this server's own hydration runs in a local transaction — so the
 * dirty tracker keys off `remote` and hydration never echoes back into a DB write.
 */
export default class GameSessionServer implements Party.Server {
  #dirty = new Map<string, Set<ScenePart>>();
  #deletedSceneIds = new Set<string>();
  #observed = false;
  #persisting = false;
  #options: YPartyKitOptions;

  constructor(public room: Party.Room) {
    this.#options = {
      persist: { mode: 'snapshot' },
      callback: {
        handler: () => this.#persistDirty(),
        debounceWait: 2000,
        debounceMaxWait: 10000
      }
    };
  }

  #markDirty(sceneId: string, parts: Iterable<ScenePart>) {
    let set = this.#dirty.get(sceneId);
    if (!set) {
      set = new Set();
      this.#dirty.set(sceneId, set);
    }
    for (const part of parts) set.add(part);
  }

  async #getDoc() {
    const doc = await unstable_getYDoc(this.room, this.#options);

    if (!this.#observed) {
      this.#observed = true;
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

    if (!isDocHydrated(doc)) {
      const snapshot = await appRequest<SessionSnapshotWire>(this.room, '/api/internal/sessionSnapshot', {
        gameSessionId: this.room.id
      });
      // Re-check: another connection may have hydrated while we awaited
      if (!isDocHydrated(doc)) {
        hydrateGameSessionDoc(doc, hydrationDataFromWire(snapshot), HYDRATION_ORIGIN);
      }
    }

    return doc;
  }

  async #persistDirty() {
    if (this.#persisting) return;
    if (this.#dirty.size === 0 && this.#deletedSceneIds.size === 0) return;

    this.#persisting = true;
    const dirty = this.#dirty;
    const deleted = this.#deletedSceneIds;
    this.#dirty = new Map();
    this.#deletedSceneIds = new Set();

    try {
      const doc = await unstable_getYDoc(this.room, this.#options);
      const payload: PersistSessionWire = {
        gameSessionId: this.room.id,
        scenes: [...dirty]
          .map(([sceneId, parts]) => sceneWireFromDoc(doc, sceneId, [...parts]))
          .filter((scene): scene is NonNullable<typeof scene> => scene !== null),
        deletedSceneIds: [...deleted]
      };
      await appRequest(this.room, '/api/internal/persistSession', payload);
    } catch (error) {
      // Merge back what we drained and retry on an alarm; the doc itself is safe
      // in room storage regardless.
      for (const [sceneId, parts] of dirty) this.#markDirty(sceneId, parts);
      for (const sceneId of deleted) this.#deletedSceneIds.add(sceneId);
      console.error(`persistSession failed for ${this.room.id}; retrying in ${PERSIST_RETRY_MS}ms`, error);
      await this.room.storage.setAlarm(Date.now() + PERSIST_RETRY_MS);
    } finally {
      this.#persisting = false;
    }
  }

  async onConnect(conn: Party.Connection) {
    await this.#getDoc();
    return onConnect(conn, this.room, this.#options);
  }

  async onClose() {
    const remaining = [...this.room.getConnections()].length;
    if (remaining === 0) {
      await this.#persistDirty();
    }
  }

  async onAlarm() {
    await this.#persistDirty();
  }

  async onRequest(req: Party.Request) {
    // Ping endpoint for diagnostics
    if (req.method === 'POST') {
      const body = (await req.json()) as { type?: string; timestamp?: number };

      // After the app writes session data to the DB directly (import, admin tools),
      // it calls this to rebuild the live doc from the database.
      if (body.type === 'resync') {
        const token = (this.room.env.INTERNAL_API_TOKEN as string | undefined) ?? 'dev-internal-token';
        if (req.headers.get('x-internal-token') !== token) {
          return new Response('Unauthorized', { status: 401 });
        }
        const doc = await unstable_getYDoc(this.room, this.#options);
        const snapshot = await appRequest<SessionSnapshotWire>(this.room, '/api/internal/sessionSnapshot', {
          gameSessionId: this.room.id
        });
        doc.transact(() => {
          const scenes = getScenesMap(doc);
          for (const sceneId of [...scenes.keys()]) scenes.delete(sceneId);
        }, HYDRATION_ORIGIN);
        hydrateGameSessionDoc(doc, hydrationDataFromWire(snapshot), HYDRATION_ORIGIN);
        // The resynced doc now matches the DB; drop any stale dirty state
        this.#dirty.clear();
        this.#deletedSceneIds.clear();
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      }

      if (body.type === 'ping') {
        return new Response(
          JSON.stringify({
            type: 'pong',
            timestamp: body.timestamp,
            serverTimestamp: Date.now(),
            roomId: this.room.id
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('OK', { status: 200 });
  }
}
