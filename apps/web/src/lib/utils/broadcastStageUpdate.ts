import type { SelectScene } from '$lib/db/gs/schema';
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
  gameIsPaused: boolean
) => {
  if (!socket || !selectedScene) return;

  if (selectedScene.id && activeScene && selectedScene.id === activeScene.id) {
    const updateData = {
      selectedScene: selectedScene,
      activeScene: activeScene,
      gameIsPaused,
      stageProps: {
        fogOfWar: stageProps.fogOfWar,
        grid: stageProps.grid,
        map: stageProps.map,
        scene: stageProps.scene,
        display: stageProps.display,
        weather: stageProps.weather,
        ping: stageProps.ping
      }
    };

    socket.emit('updateSession', updateData);
  } else if (activeScene) {
    const newStageProps = buildSceneProps(activeScene, 'editor');

    console.log('Broadcasting stage update', newStageProps);

    const updateData = {
      selectedScene,
      activeScene,
      gameIsPaused,
      stageProps: {
        fogOfWar: newStageProps.fogOfWar,
        grid: newStageProps.grid,
        map: newStageProps.map,
        scene: newStageProps.scene,
        display: newStageProps.display,
        weather: newStageProps.weather,
        ping: newStageProps.ping
      }
    };

    socket.emit('updateSession', updateData);
  }
};
