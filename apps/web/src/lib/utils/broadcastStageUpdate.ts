import type { SelectMarker, SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';
import { buildSceneProps } from './buildSceneProps';
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
  if (!socket || !selectedScene) return;

  if (selectedScene.id && activeScene && selectedScene.id === activeScene.id) {
    const updateData = {
      selectedScene: selectedScene,
      activeScene: activeScene,
      gameIsPaused,
      activeGameSessionId,
      stageProps: {
        ...stageProps
      }
    };

    socket.emit('updateSession', updateData);
  } else if (activeScene) {
    const newStageProps = buildSceneProps(activeScene, activeSceneMarkers, 'editor');

    const updateData = {
      selectedScene,
      activeScene,
      gameIsPaused,
      activeGameSessionId,
      stageProps: {
        ...newStageProps
      }
    };

    socket.emit('updateSession', updateData);
  }
};
