import type { SelectMarker, SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';
import { throttle } from './throttle';

export type BroadcastStageUpdate = {
  activeScene: SelectScene | (SelectScene & Thumb) | null;
  selectedScene: SelectScene | (SelectScene & Thumb) | null;
  stageProps: StageProps;
  gameIsPaused: boolean;
  activeGameSessionId?: string;
};

export type MarkerPositionUpdate = {
  markerId: string;
  position: { x: number; y: number };
  sceneId: string;
};

/**
 * Broadcasts a marker position update with throttling (150ms)
 * This is more efficient than sending the entire stage state
 */
export const broadcastMarkerUpdate = throttle(
  (socket: Socket | null, markerId: string, position: { x: number; y: number }, sceneId: string) => {
    if (!socket || !sceneId) return;

    const updateData: MarkerPositionUpdate = {
      markerId,
      position,
      sceneId
    };

    socket.emit('markerPositionUpdate', updateData);
  },
  150
);

/**
 * Broadcasts a simple active scene change notification
 * This tells the playfield to reload to get the new active scene data
 */
export const broadcastActiveSceneChange = (
  socket: Socket | null,
  activeSceneId: string,
  activeGameSessionId: string
) => {
  if (!socket || !activeSceneId) return;

  console.log('Broadcasting active scene change:', { activeSceneId, activeGameSessionId });

  const updateData = {
    type: 'activeSceneChange',
    activeSceneId,
    activeGameSessionId
  };

  socket.emit('activeSceneChanged', updateData);
};

/**
 * Broadcasts a full stage update
 * For efficiency, use broadcastMarkerUpdate for simple position changes
 */
export const broadcastStageUpdate = (
  socket: Socket | null,
  activeScene: BroadcastStageUpdate['activeScene'],
  selectedScene: BroadcastStageUpdate['selectedScene'],
  stageProps: BroadcastStageUpdate['stageProps'],
  activeSceneMarkers: (SelectMarker & Partial<Thumb>)[],
  gameIsPaused: boolean,
  activeGameSessionId?: string
) => {
  if (!socket || !selectedScene || !stageProps) return;

  // Since we only call this when editor is viewing the active scene with full data,
  // we can directly use the provided stage props
  const updateData = {
    selectedScene: null, // Don't send selected scene to playfield
    activeScene: activeScene,
    gameIsPaused,
    activeGameSessionId,
    stageProps: { ...stageProps }
  };

  socket.emit('updateSession', updateData);
};
