import type { Connection, ConnectionContext } from 'partyserver';
import { YServer } from 'y-partyserver';
import * as Y from 'yjs';
import {
  DOC_SCHEMA_VERSION,
  getMeta,
  getPartyState,
  getPartyStateMap,
  isDocHydrated
} from '../src/lib/realtime/docSchema';
import type { PartyStateWire } from '../src/lib/realtime/wire';
import { appRequest, internalToken } from './appApi';
import { readDirtySet, readDocSnapshot, writeDirtySet, writeDocSnapshot } from './docSnapshot';
import { createRoomActivityReporter } from './roomActivity';

const HYDRATION_ORIGIN = 'server-hydration';
const SNAPSHOT_ORIGIN = 'server-snapshot';
const PERSIST_RETRY_MS = 15000;
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface DirtyWire {
  dirty: boolean;
}

/**
 * Party-wide live state (active scene, paused). Same ownership model as the game
 * session server: hydrate from the DB on first use, persist client changes back on
 * a debounce, never echo hydration into a write. See gameSession.ts for the
 * lifecycle and hibernation notes.
 */
export class PartyServer extends YServer {
  static options = { hibernate: true };
  static callbackOptions = { debounceWait: 1000, debounceMaxWait: 5000 };

  #dirty = false;
  #observing = false;
  #persisting = false;
  #hydration: Promise<void> | null = null;
  #activity = createRoomActivityReporter(
    { name: () => this.name, env: this.env, connections: () => [...this.getConnections()].length },
    'party'
  );

  async onLoad() {
    try {
      const snapshot = await readDocSnapshot(this.ctx.storage, SNAPSHOT_MAX_AGE_MS);
      if (snapshot) Y.applyUpdate(this.document, snapshot.update, SNAPSHOT_ORIGIN);
    } catch (error) {
      console.error(`snapshot restore failed for party ${this.name}`, error);
    }
  }

  async onStart() {
    await super.onStart();
    if (!this.#observing) {
      this.#observing = true;
      getPartyStateMap(this.document).observe((_event, transaction) => {
        if (!transaction.local) this.#dirty = true;
      });
    }
    try {
      const stored = await readDirtySet<DirtyWire>(this.ctx.storage);
      if (stored?.dirty) {
        this.#dirty = true;
        await this.ctx.storage.setAlarm(Date.now());
      }
    } catch (error) {
      console.error(`dirty flag restore failed for party ${this.name}`, error);
    }
    if (!isDocHydrated(this.document)) void this.#ensureHydrated();
  }

  #ensureHydrated(): Promise<void> {
    if (!this.#hydration) {
      this.#hydration = this.#hydrate()
        .catch((error) => {
          console.error(`hydration failed for party ${this.name}; retrying in ${PERSIST_RETRY_MS}ms`, error);
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
    const state = await appRequest<PartyStateWire>(this.env, '/api/internal/partySnapshot', { partyId: this.name });
    if (isDocHydrated(this.document)) return;
    this.document.transact(() => {
      const map = getPartyStateMap(this.document);
      if (!map.has('activeSceneId')) map.set('activeSceneId', state.activeSceneId);
      if (!map.has('isPaused')) map.set('isPaused', state.isPaused);
      getMeta(this.document).set('schemaVersion', DOC_SCHEMA_VERSION);
      getMeta(this.document).set('hydratedAt', Date.now());
    }, HYDRATION_ORIGIN);
  }

  #scheduleRetry() {
    this.ctx.storage.setAlarm(Date.now() + PERSIST_RETRY_MS).catch((error) => {
      console.error(`failed to schedule retry for party ${this.name}`, error);
    });
  }

  async onAlarm() {
    if (!isDocHydrated(this.document)) await this.#ensureHydrated();
    await this.#persistState();
  }

  async onSave() {
    try {
      await writeDocSnapshot(this.ctx.storage, this.document, { dirty: this.#dirty } satisfies DirtyWire);
    } catch (error) {
      console.error(`snapshot write failed for party ${this.name}`, error);
    }
    await this.#persistState();
  }

  async #persistState() {
    if (this.#persisting || !this.#dirty) return;

    this.#persisting = true;
    this.#dirty = false;
    try {
      const state = getPartyState(this.document);
      await appRequest(this.env, '/api/internal/persistParty', {
        partyId: this.name,
        activeSceneId: state.activeSceneId,
        isPaused: state.isPaused
      });
      await writeDirtySet(this.ctx.storage, { dirty: this.#dirty } satisfies DirtyWire);
    } catch (error) {
      this.#dirty = true;
      console.error(`persistParty failed for ${this.name}; retrying in ${PERSIST_RETRY_MS}ms`, error);
      this.#scheduleRetry();
    } finally {
      this.#persisting = false;
    }
  }

  async onConnect(conn: Connection, ctx: ConnectionContext) {
    this.#activity.queue('connect', conn);
    if (!isDocHydrated(this.document)) void this.#ensureHydrated();
    await super.onConnect(conn, ctx);
  }

  async onClose(conn: Connection, code: number, reason: string, wasClean: boolean) {
    await super.onClose(conn, code, reason, wasClean);
    this.#activity.queue('close', conn);
    if ([...this.getConnections()].length === 0) {
      await Promise.all([this.onSave(), this.#activity.flush()]);
    }
  }

  async onRequest(req: Request): Promise<Response> {
    // After the app writes party state to the DB directly (import, admin tools),
    // it calls this to refresh the live doc from the database.
    if (req.method === 'POST') {
      const body = (await req.json()) as { type?: string };
      if (body.type === 'resync') {
        if (req.headers.get('x-internal-token') !== internalToken(this.env)) {
          return new Response('Unauthorized', { status: 401 });
        }
        if (this.#hydration) await this.#hydration;
        const state = await appRequest<PartyStateWire>(this.env, '/api/internal/partySnapshot', { partyId: this.name });
        this.document.transact(() => {
          const map = getPartyStateMap(this.document);
          map.set('activeSceneId', state.activeSceneId);
          map.set('isPaused', state.isPaused);
          getMeta(this.document).set('schemaVersion', DOC_SCHEMA_VERSION);
          getMeta(this.document).set('hydratedAt', Date.now());
        }, HYDRATION_ORIGIN);
        this.#dirty = false;
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response('OK', { status: 200 });
  }
}
