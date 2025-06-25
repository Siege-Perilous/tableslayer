import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

export default class GameSessionServer implements Party.Server {
  constructor(public room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    return await onConnect(conn, this.room, {
      // Use snapshot persistence mode - stores latest document state
      persist: { mode: 'snapshot' }

      // PartyKit automatically handles persistence with snapshot mode
      // No need to load from database - clients initialize Y.js with fresh data from SSR
      // No need to save to database - clients handle saving through saveScene()
    });
  }
}
