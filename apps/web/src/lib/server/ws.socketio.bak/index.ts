import { Server } from 'socket.io';
import { YSocketIO } from 'y-socket.io/dist/server';

// Global instance to prevent multiple initializations
let wsServerInstance: Server | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let ysocketioInstance: YSocketIO | null = null;

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const initializeSocketIO = (server: any) => {
  // Return existing instance if already initialized
  if (wsServerInstance) {
    return wsServerInstance;
  }

  // Check if the server already has a Socket.IO instance attached
  // @ts-expect-error - accessing private property
  if (server._socketio) {
    console.log('Socket.IO already attached to server, reusing instance');
    // @ts-expect-error - accessing private property
    return server._socketio;
  }

  const wsServer = new Server(server);

  // Increase max listeners to prevent warnings
  wsServer.setMaxListeners(20);

  // Initialize Y.js integration with Socket.IO
  const ysocketio = new YSocketIO(wsServer);
  ysocketio.initialize();

  console.log('Socket.IO server with Y.js initialized');

  // Store references
  wsServerInstance = wsServer;
  ysocketioInstance = ysocketio;
  // @ts-expect-error - storing reference on server
  server._socketio = wsServer;

  // Hook into the Y.js server to add cursor tracking
  // Y.js creates namespaces dynamically, so we need to hook into the connection events
  const originalOf = wsServer.of.bind(wsServer);
  wsServer.of = (name: string | RegExp, fn?: (namespace: ReturnType<typeof originalOf>) => void) => {
    const namespace = originalOf(name, fn);

    // If this is a Y.js namespace, add our cursor handlers
    if (typeof name === 'string' && name.startsWith('/yjs|')) {
      const roomName = name.split('|')[1];

      namespace.on('connect', (socket) => {
        // Ensure the socket joins the room explicitly
        socket.join(roomName);

        // Set user data for disconnect tracking
        socket.on('cursorMove', (data) => {
          // Broadcast cursor updates to all other clients in the same room
          socket.to(roomName).emit('cursorUpdate', data);
        });

        socket.on('disconnect', () => {
          // Notify other clients in the same room about user disconnect
          if (socket.data?.userId) {
            socket.to(roomName).emit('userDisconnect', socket.data.userId);
          }
        });
      });
    } else if (name instanceof RegExp && name.source.includes('yjs')) {
      namespace.on('connect', (socket) => {
        const namespaceName = socket.nsp.name;
        const roomName = namespaceName.split('|')[1];

        // Ensure the socket joins the room explicitly
        socket.join(roomName);

        socket.on('cursorMove', (data) => {
          socket.to(roomName).emit('cursorUpdate', data);
        });

        socket.on('disconnect', () => {
          if (socket.data?.userId) {
            socket.to(roomName).emit('userDisconnect', socket.data.userId);
          }
        });
      });
    }

    return namespace;
  };

  return wsServer;
};

// Clean up on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    if (wsServerInstance) {
      wsServerInstance.close();
      wsServerInstance = null;
      ysocketioInstance = null;
    }
  });
}
