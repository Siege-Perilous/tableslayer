import type { SelectAnnotation, SelectMarker } from '$lib/db/app/schema';
import { getMarkersForScene, type Thumb } from '$lib/server';
import { getAnnotationMaskData, getAnnotationsForScene } from '$lib/server/annotations';
import { createScene, getSceneFromOrder, getSceneMaskData, getScenes } from '$lib/server/scene';
import { getPreferenceServer } from '$lib/utils/gameSessionPreferences';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params, url, cookies }) => {
  const { gameSession, activeScene } = await parent();
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';

  // Get all scenes first to determine the lowest order
  let scenes = await getScenes(gameSession.id);

  if (scenes.length === 0) {
    await createScene({ name: 'Scene 1', gameSessionId: gameSession.id });
    scenes = await getScenes(gameSession.id);
  }

  // Find the lowest order number among existing scenes
  const lowestOrder = Math.min(...scenes.map((s) => s.order));

  let selectedSceneNumber = Number(params.selectedScene);

  // If no scene number is provided in the URL, redirect to the lowest ordered scene
  if (!params.selectedScene) {
    // Ensure pathname ends with a slash before appending the scene number
    const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    throw redirect(302, `${path}${lowestOrder}`);
  }

  if (isNaN(selectedSceneNumber)) {
    selectedSceneNumber = lowestOrder;
  }

  // check if activeSceneNumber is valid - check if the scene with this order exists
  if (!scenes.some((s) => s.order === selectedSceneNumber)) {
    selectedSceneNumber = lowestOrder;
  }
  const selectedScene = await getSceneFromOrder(gameSession.id, selectedSceneNumber);
  const selectedSceneMarkers = await getMarkersForScene(selectedScene.id);
  const selectedSceneAnnotations = await getAnnotationsForScene(selectedScene.id);

  // Get fog mask data separately
  let selectedSceneFogMask: string | null = null;
  try {
    const maskData = await getSceneMaskData(selectedScene.id);
    selectedSceneFogMask = maskData.fogOfWarMask;
  } catch (error) {
    // Silently ignore - scene might not have mask data yet
  }

  // Get annotation mask data for all annotations
  const selectedSceneAnnotationMasks: Record<string, string | null> = {};
  try {
    for (const annotation of selectedSceneAnnotations) {
      const maskData = await getAnnotationMaskData(annotation.id);
      selectedSceneAnnotationMasks[annotation.id] = maskData?.mask || null;
    }
  } catch (error) {
    // Silently ignore - annotations might not have mask data yet
  }
  let activeSceneMarkers: (SelectMarker & Partial<Thumb>)[] = [];
  let activeSceneAnnotations: SelectAnnotation[] = [];
  if (activeScene) {
    activeSceneMarkers = await getMarkersForScene(activeScene.id);
    activeSceneAnnotations = await getAnnotationsForScene(activeScene.id);
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
    selectedSceneAnnotations,
    selectedSceneAnnotationMasks,
    selectedSceneFogMask,
    activeScene,
    activeSceneMarkers,
    activeSceneAnnotations,
    paneLayoutDesktop,
    paneLayoutMobile,
    brushSize,
    partykitHost
  };
};
