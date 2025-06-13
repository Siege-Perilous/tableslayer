import { type BroadcastStageUpdate, type MarkerPositionUpdate } from '$lib/utils';
import type { PropertyUpdates } from '$lib/utils/propertyUpdateBroadcaster';
import { Server } from 'socket.io';
import { YSocketIO } from 'y-socket.io/dist/server';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const initializeSocketIO = (server: any) => {
  const wsServer = new Server(server);

  // Initialize Y.js collaborative editing support
  const ySocketIO = new YSocketIO(wsServer, {
    gcEnabled: true
  });
  ySocketIO.initialize();

  // Party namespace (for both editors and play route)
  wsServer.of(/^\/party\/\w+$/).on('connect', (socket) => {
    console.log(`Client connected to party namespace: ${socket.nsp.name}`);

    // Listen for game session updates (full state updates) from editors
    // Keep this for player view compatibility
    socket.on('updateSession', (data: BroadcastStageUpdate) => {
      socket.nsp.emit('sessionUpdated', data); // Broadcast to all clients in party
    });

    // Listen for optimized marker position updates from editors
    // Keep this for player view compatibility
    socket.on('markerPositionUpdate', (data: MarkerPositionUpdate) => {
      // Broadcast only the marker position data (much smaller payload)
      socket.nsp.emit('markerUpdated', data);
    });

    // Listen for optimized property updates from editors
    // Keep this for player view compatibility
    socket.on('propertyUpdates', (data: PropertyUpdates) => {
      // Broadcast only the specific property updates (smaller payload)
      socket.nsp.emit('propertiesUpdated', data);
    });

    // Listen for cursor movements from both editors and play route
    socket.on('cursorMove', (data) => {
      // Broadcast cursor updates to other clients in the same namespace
      socket.broadcast.emit('cursorUpdate', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected from party namespace: ${socket.nsp.name}`);
      // Notify other clients about user disconnect
      socket.broadcast.emit('userDisconnect', socket.data?.userId);
    });
  });

  return wsServer;
};
