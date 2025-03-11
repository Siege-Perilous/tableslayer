import type { SelectMarker, SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';
import { buildSceneProps } from './buildSceneProps';

export type BroadcastStageUpdate = {
  activeScene: SelectScene | (SelectScene & Thumb) | null;
  selectedScene: SelectScene | (SelectScene & Thumb) | null;
  stageProps: StageProps;
  gameIsPaused: boolean;
};

export const broadcastStageUpdate = (
  socket: Socket | null,
  activeScene: BroadcastStageUpdate['activeScene'],
  selectedScene: BroadcastStageUpdate['selectedScene'],
  stageProps: BroadcastStageUpdate['stageProps'],
  activeSceneMarkers: (SelectMarker & Partial<Thumb>)[],
  gameIsPaused: boolean
) => {
  if (!socket || !selectedScene) return;

  if (selectedScene.id && activeScene && selectedScene.id === activeScene.id) {
    const updateData = {
      selectedScene: selectedScene,
      activeScene: activeScene,
      gameIsPaused,
      stageProps: {
        ...stageProps
      }
    };

    socket.emit('updateSession', updateData);
  } else if (activeScene) {
    const newStageProps = buildSceneProps(activeScene, activeSceneMarkers, 'editor');

    console.log('Broadcasting stage update', newStageProps);

    const updateData = {
      selectedScene,
      activeScene,
      gameIsPaused,
      stageProps: {
        ...newStageProps
      }
    };

    socket.emit('updateSession', updateData);
  }
};
