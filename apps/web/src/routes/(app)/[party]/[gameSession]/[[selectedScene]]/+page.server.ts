import type { SelectMarker } from '$lib/db/app/schema';
import { getMarkersForScene, type Thumb } from '$lib/server';
import { createScene, getSceneFromOrder, getScenes } from '$lib/server/scene';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
  const { gameSession, activeScene } = await parent();
  let selectedSceneNumber = Number(params.selectedScene);
  if (isNaN(selectedSceneNumber)) {
    selectedSceneNumber = 1;
  }

  let scenes = await getScenes(gameSession.id);

  if (scenes.length === 0) {
    await createScene({ name: 'Scene 1', gameSessionId: gameSession.id });
    scenes = await getScenes(gameSession.id);
  }

  // check if activeSceneNumber is valid
  if (selectedSceneNumber < 1 || selectedSceneNumber > scenes.length) {
    selectedSceneNumber = 1;
  }
  const selectedScene = await getSceneFromOrder(gameSession.id, selectedSceneNumber);
  const selectedSceneMarkers = await getMarkersForScene(selectedScene.id);
  let activeSceneMarkers: (SelectMarker & Partial<Thumb>)[] = [];
  if (activeScene) {
    activeSceneMarkers = await getMarkersForScene(activeScene.id);
  }

  return {
    scenes,
    selectedSceneNumber,
    selectedScene,
    selectedSceneMarkers,
    activeScene,
    activeSceneMarkers
  };
};
