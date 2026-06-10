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
  #options: YPartyKitOptions;

  constructor(public room: Party.Room) {
    this.#options = {
      persist: { mode: 'snapshot' },
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
      await this.#persistState();
    }
  }

  async onAlarm() {
    await this.#persistState();
  }
}
