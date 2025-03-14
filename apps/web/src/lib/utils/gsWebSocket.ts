import type { StageProps } from '@tableslayer/ui';
import { io, type Socket } from 'socket.io-client';
import type { MarkerPositionUpdate } from './broadcastStageUpdate';

/**
 * Sets up the WebSocket connection for a game session
 * Includes handlers for both full updates and optimized marker updates
 */
export const setupGameSessionWebSocket = (
  gameSessionId: string,
  onConnect: () => void,
  onDisconnect: () => void,
  onMarkerUpdate?: (markerUpdate: MarkerPositionUpdate, stageProps: StageProps) => void,
  stageProps?: StageProps
): Socket => {
  const sanitizedId = gameSessionId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const socket = io(`ws${location.origin.slice(4)}/gameSession/${sanitizedId}`, {
    reconnectionDelayMax: 10000
  });

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  // Setup handler for optimized marker updates
  if (onMarkerUpdate && stageProps) {
    socket.on('markerUpdated', (data: MarkerPositionUpdate) => {
      onMarkerUpdate(data, stageProps);
    });
  }

  return socket;
};
