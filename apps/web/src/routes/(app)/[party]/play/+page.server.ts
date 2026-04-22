import type { SelectAnnotation, SelectLight, SelectMarker } from '$lib/db/app/schema';
import {
  getActiveGameSessionForParty,
  getActiveSceneForParty,
  getLightsForScene,
  getMarkersForScene,
  getPartyFromSlug,
  getPartyGameSessions,
  getUser
} from '$lib/server';
import { getAnnotationsForScene } from '$lib/server/annotations';
import { getSceneList } from '$lib/server/scene';
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

  // Get all game sessions for this party with lightweight scene list (id + name only)
  const allGameSessions = await getPartyGameSessions(party.id);
  const gameSessionsWithScenes = await Promise.all(
    allGameSessions.map(async (gs) => ({
      id: gs.id,
      name: gs.name,
      scenes: await getSceneList(gs.id)
    }))
  );

  // Get the active scene for the party (now at party level, not game session level)
  const activeScene = await getActiveSceneForParty(party.id);

  let activeSceneMarkers: SelectMarker[] = [];
  let activeSceneLights: SelectLight[] = [];
  let activeSceneAnnotations: SelectAnnotation[] = [];

  if (activeScene) {
    [activeSceneMarkers, activeSceneLights, activeSceneAnnotations] = await Promise.all([
      getMarkersForScene(activeScene.id),
      getLightsForScene(activeScene.id),
      getAnnotationsForScene(activeScene.id)
    ]);
  }

  return {
    user,
    party,
    activeGameSession,
    gameSessionsWithScenes,
    activeScene,
    activeSceneMarkers,
    activeSceneLights,
    activeSceneAnnotations,
    partykitHost
  };
};
