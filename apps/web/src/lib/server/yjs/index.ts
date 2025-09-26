import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { WebSocketServer, type WebSocket as WSWebSocket } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';

// Message types for Y.js WebSocket protocol
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/**
 * Custom Y.js WebSocket server implementation
 * Since the standard utilities are deprecated, we implement the protocol manually
 */
export class YjsWebSocketServer {
  private wss: WebSocketServer | null = null;
  private docs = new Map<string, Y.Doc>();
  private awarenessStates = new Map<string, awarenessProtocol.Awareness>();

  /**
   * Initialize the Y.js WebSocket server
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(server: any) {
    // Create WebSocket server on the existing HTTP server
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      console.log(`Y.js WebSocket connection to: ${url.pathname}`);

      // Extract document name from URL path
      const docName = this.extractDocumentName(url.pathname);

      if (!docName) {
        console.log(`Y.js connection rejected: invalid path ${url.pathname}`);
        ws.close();
        return;
      }

      console.log(`Y.js client connected to document: ${docName}`);

      // Set up Y.js document and awareness
      this.setupConnection(ws, docName);
    });

    console.log('Y.js WebSocket server initialized');
    return this.wss;
  }

  /**
   * Set up Y.js connection for a WebSocket
   */
  private setupConnection(ws: WSWebSocket, docName: string) {
    // Get or create document
    let doc = this.docs.get(docName);
    if (!doc) {
      doc = new Y.Doc();
      this.docs.set(docName, doc);
    }

    // Get or create awareness
    let awareness = this.awarenessStates.get(docName);
    if (!awareness) {
      awareness = new awarenessProtocol.Awareness(doc);
      this.awarenessStates.set(docName, awareness);
    }

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const decoder = decoding.createDecoder(new Uint8Array(data));
        const encoder = encoding.createEncoder();
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MESSAGE_SYNC:
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, doc, null);

            // Send sync response
            if (encoding.length(encoder) > 1) {
              ws.send(encoding.toUint8Array(encoder));
            }
            break;

          case MESSAGE_AWARENESS:
            awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), ws);
            break;
        }
      } catch (error) {
        console.error('Error handling Y.js message:', error);
      }
    });

    // Send initial sync
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));

    // Handle awareness changes
    const awarenessChangeHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      origin: unknown
    ) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);

      // Broadcast to all connected clients for this document
      this.broadcast(docName, buff, ws);
    };

    awareness.on('change', awarenessChangeHandler);

    // Handle document updates
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin !== ws) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeUpdate(encoder, update);

        // Broadcast to all connected clients for this document
        this.broadcast(docName, encoding.toUint8Array(encoder), ws);
      }
    };

    doc.on('update', updateHandler);

    // Cleanup on disconnect
    ws.on('close', () => {
      console.log(`Y.js client disconnected from document: ${docName}`);
      awareness.off('change', awarenessChangeHandler);
      doc.off('update', updateHandler);

      // Remove client from awareness
      awarenessProtocol.removeAwarenessStates(awareness, [awareness.clientID], ws);
    });
  }

  /**
   * Broadcast message to all clients connected to a document (except sender)
   */
  private broadcast(docName: string, message: Uint8Array, sender: WSWebSocket) {
    if (!this.wss) return;

    this.wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === 1) {
        // WebSocket.OPEN
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting Y.js message:', error);
        }
      }
    });
  }

  /**
   * Extract document name from WebSocket path
   * Expected format: /yjs/party/[partyId] -> document name: "party-[partyId]"
   */
  private extractDocumentName(pathname: string): string | null {
    // Expected format: /yjs/party/[partyId]
    const match = pathname.match(/^\/yjs\/party\/([^\/]+)$/);
    if (match) {
      return `party-${match[1]}`;
    }
    return null;
  }

  /**
   * Clean up resources
   */
  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Clean up documents and awareness states
    this.docs.forEach((doc) => doc.destroy());
    this.awarenessStates.forEach((awareness) => awareness.destroy());
    this.docs.clear();
    this.awarenessStates.clear();
  }
}

// Export singleton instance
export const yjsServer = new YjsWebSocketServer();

/**
 * Initialize Y.js WebSocket server (replacement for socket.io)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initializeYjsWebSocket = (server: any) => {
  return yjsServer.initialize(server);
};
