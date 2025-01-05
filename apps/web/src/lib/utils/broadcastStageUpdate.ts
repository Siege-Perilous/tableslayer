import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';

export const broadcastStageUpdate = (
  socket: Socket | null,
  activeSceneId: string | null,
  selectedSceneId: string | null,
  stageProps: StageProps
) => {
  if (!socket || activeSceneId !== selectedSceneId) return;

  const updateData = {
    sceneId: selectedSceneId,
    activeSceneId: activeSceneId || '',
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
