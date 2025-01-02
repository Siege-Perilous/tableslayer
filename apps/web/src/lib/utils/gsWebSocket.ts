import { io, type Socket } from 'socket.io-client';

export const setupGameSessionWebSocket = (
  gameSessionId: string,
  onConnect: () => void,
  onDisconnect: () => void
): Socket => {
  const sanitizedId = gameSessionId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const socket = io(`ws${location.origin.slice(4)}/gameSession/${sanitizedId}`, {
    reconnectionDelayMax: 10000
  });

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  return socket;
};
