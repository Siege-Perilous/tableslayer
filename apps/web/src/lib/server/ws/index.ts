import { type BroadcastStageUpdate, type MarkerPositionUpdate } from '$lib/utils';
import type { PropertyUpdates } from '$lib/utils/propertyUpdateBroadcaster';
import { Server } from 'socket.io';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const initializeSocketIO = (server: any) => {
  const wsServer = new Server(server);

  wsServer.of(/^\/gameSession\/\w+$/).on('connect', (socket) => {
    console.log(`Client connected to namespace: ${socket.nsp.name}`);

    // Listen for game session updates (full state updates)
    socket.on('updateSession', (data: BroadcastStageUpdate) => {
      socket.nsp.emit('sessionUpdated', data); // Broadcast to namespace
    });

    // Listen for optimized marker position updates
    socket.on('markerPositionUpdate', (data: MarkerPositionUpdate) => {
      // Broadcast only the marker position data (much smaller payload)
      socket.nsp.emit('markerUpdated', data);
    });

    // Listen for optimized property updates
    socket.on('propertyUpdates', (data: PropertyUpdates) => {
      // Broadcast only the specific property updates (smaller payload)
      socket.nsp.emit('propertiesUpdated', data);
    });

    // Listen for cursor movements
    socket.on('cursorMove', (data) => {
      // Broadcast cursor updates to other clients in the same namespace
      socket.broadcast.emit('cursorUpdate', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected from namespace: ${socket.nsp.name}`);
    });
  });

  return wsServer;
};
