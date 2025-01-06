import type { SelectScene } from '$lib/db/gs/schema';
import type { Thumb } from '$lib/server';
import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';

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
  if (!socket || !selectedScene || !activeScene || selectedScene.id !== activeScene.id) return;

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

  socket.emit('updateSession', updateData);
};
