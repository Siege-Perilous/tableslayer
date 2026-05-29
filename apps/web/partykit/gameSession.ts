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

  async onRequest(req: Party.Request) {
    // Handle ping requests for diagnostics
    if (req.method === 'POST') {
      const body = await req.json();
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
