import type * as Party from 'partykit/server';
import { onConnect, unstable_getYDoc, type YPartyKitOptions } from 'y-partykit';
import {
  DOC_SCHEMA_VERSION,
  getMeta,
  getPartyState,
  getPartyStateMap,
  isDocHydrated
} from '../src/lib/realtime/docSchema';
import type { PartyStateWire } from '../src/lib/realtime/wire';
import { appRequest } from './appApi';

const HYDRATION_ORIGIN = 'server-hydration';
const PERSIST_RETRY_MS = 15000;

/**
 * Party-wide live state (active scene, paused). Same ownership model as the game
 * session server: hydrate from the DB on first use, persist client changes back on
 * a debounce, never echo hydration into a write.
 */
export default class PartyServer implements Party.Server {
  #dirty = false;
  #observed = false;
  #persisting = false;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  #options: YPartyKitOptions;

  constructor(public room: Party.Room) {
    this.#options = {
      persist: { mode: 'snapshot' },
      gc: false, // y-partykit forces this with persist; setting it keeps the options hash stable
      callback: {
        handler: () => this.#persistState(),
        debounceWait: 1000,
        debounceMaxWait: 5000
      }
    };
  }

  async #getDoc() {
    const doc = await unstable_getYDoc(this.room, this.#options);

    if (!this.#observed) {
      this.#observed = true;
      getPartyStateMap(doc).observe((_event, transaction) => {
        if (!transaction.local) this.#dirty = true;
      });
    }

    if (!isDocHydrated(doc)) {
      const state = await appRequest<PartyStateWire>(this.room, '/api/internal/partySnapshot', {
        partyId: this.room.id
      });
      if (!isDocHydrated(doc)) {
        doc.transact(() => {
          const map = getPartyStateMap(doc);
          if (!map.has('activeSceneId')) map.set('activeSceneId', state.activeSceneId);
          if (!map.has('isPaused')) map.set('isPaused', state.isPaused);
          getMeta(doc).set('schemaVersion', DOC_SCHEMA_VERSION);
          getMeta(doc).set('hydratedAt', Date.now());
        }, HYDRATION_ORIGIN);
      }
    }

    return doc;
  }

  async #persistState() {
    if (this.#persisting || !this.#dirty) return;

    this.#persisting = true;
    this.#dirty = false;
    try {
      const doc = await unstable_getYDoc(this.room, this.#options);
      const state = getPartyState(doc);
      await appRequest(this.room, '/api/internal/persistParty', {
        partyId: this.room.id,
        activeSceneId: state.activeSceneId,
        isPaused: state.isPaused
      });
    } catch (error) {
      this.#dirty = true;
      console.error(`persistParty failed for ${this.room.id}; retrying in ${PERSIST_RETRY_MS}ms`, error);
      this.#scheduleRetry();
    } finally {
      this.#persisting = false;
    }
  }

  // PartyKit alarms cannot read room.id (platform limitation), so retries use an
  // in-instance timer. If the room is evicted before the retry fires, the doc
  // snapshot is still safe and the next connection re-hydrates and re-persists.
  #scheduleRetry() {
    if (this.#retryTimer) return;
    this.#retryTimer = setTimeout(async () => {
      this.#retryTimer = null;
      try {
        await this.#getDoc();
      } catch (error) {
        console.error(`hydration retry failed for party ${this.room.id}`, error);
        this.#scheduleRetry();
      }
      await this.#persistState();
    }, PERSIST_RETRY_MS);
  }

  async onConnect(conn: Party.Connection) {
    // A failed hydration must not kill the websocket: keep the connection open,
    // let clients wait on the ready gate, and retry shortly.
    try {
      await this.#getDoc();
    } catch (error) {
      console.error(`hydration failed for party ${this.room.id}; retrying in ${PERSIST_RETRY_MS}ms`, error);
      this.#scheduleRetry();
    }
    return onConnect(conn, this.room, this.#options);
  }

  async onClose() {
    const remaining = [...this.room.getConnections()].length;
    if (remaining === 0) {
      await this.#persistState();
    }
  }

  async onRequest(req: Party.Request) {
    // After the app writes party state to the DB directly (import, admin tools),
    // it calls this to refresh the live doc from the database.
    if (req.method === 'POST') {
      const body = (await req.json()) as { type?: string };
      if (body.type === 'resync') {
        const token = (this.room.env.INTERNAL_API_TOKEN as string | undefined) ?? 'dev-internal-token';
        if (req.headers.get('x-internal-token') !== token) {
          return new Response('Unauthorized', { status: 401 });
        }
        const doc = await unstable_getYDoc(this.room, this.#options);
        const state = await appRequest<PartyStateWire>(this.room, '/api/internal/partySnapshot', {
          partyId: this.room.id
        });
        doc.transact(() => {
          const map = getPartyStateMap(doc);
          map.set('activeSceneId', state.activeSceneId);
          map.set('isPaused', state.isPaused);
          getMeta(doc).set('schemaVersion', DOC_SCHEMA_VERSION);
          getMeta(doc).set('hydratedAt', Date.now());
        }, HYDRATION_ORIGIN);
        this.#dirty = false;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response('OK', { status: 200 });
  }
}
