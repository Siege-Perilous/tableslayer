import { createScene, getSceneFromOrder, getScenes } from '$lib/server/scene';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
  const { gameSession, activeScene } = await parent();
  let selectedSceneNumber = Number(params.selectedScene);
  if (isNaN(selectedSceneNumber)) {
    selectedSceneNumber = 1;
  }

  let scenes = await getScenes(gameSession.dbName);

  if (scenes.length === 0) {
    await createScene(gameSession.dbName, { name: 'Scene 1' });
    scenes = await getScenes(gameSession.dbName);
  }

  // check if activeSceneNumber is valid
  if (selectedSceneNumber < 1 || selectedSceneNumber > scenes.length) {
    selectedSceneNumber = 1;
  }
  const selectedScene = await getSceneFromOrder(gameSession.dbName, selectedSceneNumber);

  return {
    scenes,
    selectedSceneNumber,
    selectedScene,
    activeScene
  };
};
