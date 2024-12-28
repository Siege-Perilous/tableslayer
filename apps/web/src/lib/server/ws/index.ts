import { Server } from 'socket.io';

export const initializeSocketIO = (server: any) => {
  const wsServer = new Server(server);

  wsServer.of(/^\/gameSession\/\w+$/).on('connect', (socket) => {
    console.log(`Client connected to namespace: ${socket.nsp.name}`);

    // Listen for game session updates
    socket.on('updateSession', (data) => {
      console.log(`Update received for ${socket.nsp.name}:`);
      socket.nsp.emit('sessionUpdated', data); // Broadcast to namespace
    });

    // Listen for cursor movements
    socket.on('cursorMove', (data) => {
      console.log(`Cursor move from user ${data.user.name}:`, data.position);

      // Broadcast cursor updates to other clients in the same namespace
      socket.broadcast.emit('cursorUpdate', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected from namespace: ${socket.nsp.name}`);
    });
  });

  return wsServer;
};
