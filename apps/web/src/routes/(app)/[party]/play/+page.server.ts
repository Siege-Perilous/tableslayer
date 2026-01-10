import type { SelectAnnotation, SelectMarker } from '$lib/db/app/schema';
import {
  getActiveGameSessionForParty,
  getActiveSceneForParty,
  getMarkersForScene,
  getPartyFromSlug,
  getPartyGameSessions,
  getUser
} from '$lib/server';
import { getAnnotationMaskData, getAnnotationsForScene } from '$lib/server/annotations';
import { getSceneMaskData, getScenes } from '$lib/server/scene';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';

  const party = await getPartyFromSlug(params.party);
  if (!party) {
    return redirect(302, '/login');
  }

  if (!event.locals.user) {
    return redirect(302, '/login');
  }

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  if (!user) {
    return redirect(302, '/login');
  }

  // Get the active game session for this party
  const activeGameSession = await getActiveGameSessionForParty(party.id);

  // Get all game sessions for this party with their scenes
  const allGameSessions = await getPartyGameSessions(party.id);
  const gameSessionsWithScenes = await Promise.all(
    allGameSessions.map(async (gs) => ({
      ...gs,
      scenes: await getScenes(gs.id)
    }))
  );

  // Get all scenes for the active game session (for backwards compatibility)
  const scenes = activeGameSession ? await getScenes(activeGameSession.id) : [];

  // Get the active scene for the party (now at party level, not game session level)
  const activeScene = await getActiveSceneForParty(party.id);

  let activeSceneMarkers: SelectMarker[] = [];
  let activeSceneAnnotations: SelectAnnotation[] = [];
  let activeSceneFogMask: string | null = null;
  let activeSceneAnnotationMasks: Record<string, string | null> = {};

  if (activeScene) {
    activeSceneMarkers = await getMarkersForScene(activeScene.id);
    activeSceneAnnotations = await getAnnotationsForScene(activeScene.id);

    // Get fog mask data
    try {
      const maskData = await getSceneMaskData(activeScene.id);
      activeSceneFogMask = maskData.fogOfWarMask;
    } catch {
      // Silently ignore - scene might not have mask data yet
    }

    // Get annotation mask data for all annotations
    try {
      for (const annotation of activeSceneAnnotations) {
        const maskData = await getAnnotationMaskData(annotation.id);
        activeSceneAnnotationMasks[annotation.id] = maskData?.mask || null;
      }
    } catch {
      // Silently ignore - annotations might not have mask data yet
    }
  }

  return {
    user,
    party,
    activeGameSession,
    gameSessionsWithScenes,
    scenes,
    activeScene,
    activeSceneMarkers,
    activeSceneAnnotations,
    activeSceneFogMask,
    activeSceneAnnotationMasks,
    partykitHost
  };
};
