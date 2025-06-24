import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

export default class GameSessionServer implements Party.Server {
  constructor(public party: Party.Party) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Get userId from query params for awareness/cursor tracking
    const userId = new URL(ctx.request.url).searchParams.get('userId');

    return await onConnect(conn, this.party, {
      // Use snapshot persistence mode - stores latest document state
      persist: { mode: 'snapshot' },

      // Load from SQLite on first connection
      async load() {
        // TODO: Implement loading from SQLite
        // For now, return null to start with empty document
        const gameSessionId = this.party.id;
        console.log(`Loading document for game session: ${gameSessionId}`);
        return null;
      },

      // Save to SQLite periodically
      callback: {
        async handler(yDoc) {
          // TODO: Implement saving to SQLite
          // This will be called periodically after document changes
          const gameSessionId = this.party.id;
          console.log(`Saving document for game session: ${gameSessionId}`);

          // Extract data from Y.js document
          const yScenes = yDoc.getMap('scenes');
          const yScenesList = yDoc.getArray('scenesList');

          // Convert to database format and save
          // await saveToDatabase(gameSessionId, scenes, scenesList);
        },
        debounceWait: 10000, // Wait 10 seconds after last change
        debounceMaxWait: 30000, // Force save after 30 seconds
        timeout: 5000 // Timeout for save operation
      }
    });
  }
}
