import {
  checkUserChecklistEligibility,
  getLightsForScene,
  getMarkersForScene,
  getUserChecklistState
} from '$lib/server';
import { getAnnotationMasksForScene, getAnnotationsForScene } from '$lib/server/annotations';
import { createScene, getScene, getSceneMaskData, getScenes } from '$lib/server/scene';
import { getPreferenceServer } from '$lib/utils/gameSessionPreferences';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Scenes are addressed by id. Legacy ordinal URLs (/1, /2, ...) redirect once to
// the id of the scene at that order. The load seeds first paint only — all live
// scene content comes from the session doc once the realtime connection is ready.
export const load: PageServerLoad = async ({ parent, params, url, cookies }) => {
  const { gameSession, activeScene, gameSessions, user, parties } = await parent();
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';

  let scenes = await getScenes(gameSession.id);
  if (scenes.length === 0) {
    await createScene({ name: 'Scene 1', gameSessionId: gameSession.id });
    scenes = await getScenes(gameSession.id);
  }

  const basePath = url.pathname.replace(/\/$/, '').split('/').slice(0, 3).join('/');
  const firstScene = scenes.reduce((lowest, scene) => (scene.order < lowest.order ? scene : lowest), scenes[0]);

  let sceneFromList = params.selectedScene ? scenes.find((scene) => scene.id === params.selectedScene) : undefined;

  if (!sceneFromList && params.selectedScene && /^\d+$/.test(params.selectedScene)) {
    // Legacy ordinal URL — redirect to the id of the scene at that order
    const byOrder = scenes.find((scene) => scene.order === Number(params.selectedScene));
    throw redirect(301, `${basePath}/${(byOrder ?? firstScene).id}`);
  }

  if (!sceneFromList) {
    if (params.selectedScene) {
      // Unknown scene id (deleted?) — fall back to the first scene
      throw redirect(302, `${basePath}/${firstScene.id}`);
    }
    throw redirect(302, `${basePath}/${firstScene.id}`);
  }

  // Full scene data for first paint (the doc takes over once connected)
  const selectedScene = await getScene(sceneFromList.id);
  const [selectedSceneMarkers, selectedSceneLights, selectedSceneAnnotations, fogMaskResult, annotationMasks] =
    await Promise.all([
      getMarkersForScene(selectedScene.id),
      getLightsForScene(selectedScene.id),
      getAnnotationsForScene(selectedScene.id),
      getSceneMaskData(selectedScene.id).catch(() => ({ fogOfWarMask: null })),
      getAnnotationMasksForScene(selectedScene.id)
    ]);

  const paneLayoutDesktop = getPreferenceServer(cookies, 'paneLayoutDesktop');
  const paneLayoutMobile = getPreferenceServer(cookies, 'paneLayoutMobile');

  const checklistState = await getUserChecklistState(user.id);
  const isEligibleForAutoShow = checkUserChecklistEligibility(
    parties?.length ?? 0,
    gameSessions?.length ?? 0,
    scenes.length
  );

  return {
    scenes,
    selectedScene,
    selectedSceneMarkers,
    selectedSceneLights,
    selectedSceneAnnotations,
    selectedSceneAnnotationMasks: annotationMasks,
    selectedSceneFogMask: fogMaskResult.fogOfWarMask,
    activeScene,
    paneLayoutDesktop,
    paneLayoutMobile,
    partykitHost,
    checklistState: {
      completedItems: checklistState.completedItems,
      isDismissed: checklistState.isDismissed,
      isEligibleForAutoShow
    }
  };
};
