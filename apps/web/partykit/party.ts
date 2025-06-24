import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

export default class PartyServer implements Party.Server {
  constructor(public party: Party.Party) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Get userId from query params
    const userId = new URL(ctx.request.url).searchParams.get('userId');

    return await onConnect(conn, this.party, {
      // Use snapshot persistence for party state
      persist: { mode: 'snapshot' }

      // Party state is simpler - just pause state and active scene
      // No custom load/save needed as PartyKit handles persistence
    });
  }
}
