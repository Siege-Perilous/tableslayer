import type { SelectMarker } from '$lib/db/app/schema';
import { getMarkersForScene, type Thumb } from '$lib/server';
import { createScene, getSceneFromOrder, getScenes } from '$lib/server/scene';
import { getPreferenceServer } from '$lib/utils/gameSessionPreferences';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params, url, cookies }) => {
  const { gameSession, activeScene } = await parent();
  let selectedSceneNumber = Number(params.selectedScene);

  // If no scene number is provided in the URL, redirect to scene 1
  if (!params.selectedScene) {
    // Ensure pathname ends with a slash before appending the scene number
    const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    throw redirect(302, `${path}1`);
  }

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

  // Get preferences from cookies using the new system
  const paneLayoutDesktop = getPreferenceServer(cookies, 'paneLayoutDesktop');
  const paneLayoutMobile = getPreferenceServer(cookies, 'paneLayoutMobile');
  const brushSize = getPreferenceServer(cookies, 'brushSize');

  return {
    scenes,
    selectedSceneNumber,
    selectedScene,
    selectedSceneMarkers,
    activeScene,
    activeSceneMarkers,
    paneLayoutDesktop,
    paneLayoutMobile,
    brushSize
  };
};
