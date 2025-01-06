import type { SelectScene } from '$lib/db/gs/schema';
import type { Thumb } from '$lib/server';
import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';
import { buildSceneProps } from './buildSceneProps';

export type BroadcastStageUpdate = {
  activeScene: SelectScene | (SelectScene & Thumb) | null;
  selectedScene: SelectScene | (SelectScene & Thumb) | null;
  stageProps: StageProps;
};

export const broadcastStageUpdate = (
  socket: Socket | null,
  activeScene: BroadcastStageUpdate['activeScene'],
  selectedScene: BroadcastStageUpdate['selectedScene'],
  stageProps: BroadcastStageUpdate['stageProps']
) => {
  if (!socket || !selectedScene) return;

  if (selectedScene.id && activeScene && selectedScene.id === activeScene.id) {
    const updateData = {
      selectedScene: selectedScene,
      activeScene: activeScene,
      stageProps: {
        fogOfWar: stageProps.fogOfWar,
        grid: stageProps.grid,
        map: stageProps.map,
        scene: stageProps.scene,
        display: stageProps.display,
        ping: stageProps.ping
      }
    };

    console.log('Broadcasting update, active is selected:', updateData);
    socket.emit('updateSession', updateData);
  } else if (activeScene) {
    const newStageProps = buildSceneProps(activeScene);

    const updateData = {
      selectedScene: selectedScene,
      activeScene: activeScene,
      stageProps: {
        fogOfWar: newStageProps.fogOfWar,
        grid: newStageProps.grid,
        map: newStageProps.map,
        scene: newStageProps.scene,
        display: newStageProps.display,
        ping: newStageProps.ping
      }
    };

    console.log('Broadcasting update, active is not selected:', updateData);
    socket.emit('updateSession', updateData);
  }
};
