import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

export default class PartyServer implements Party.Server {
  constructor(public room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    return await onConnect(conn, this.room, {
      // Use snapshot persistence for party state
      persist: { mode: 'snapshot' }

      // Party state is simpler - just pause state and active scene
      // No custom load/save needed as PartyKit handles persistence
    });
  }
}
