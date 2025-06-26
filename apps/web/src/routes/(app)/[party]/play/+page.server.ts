import type { SelectAnnotation, SelectMarker } from '$lib/db/app/schema';
import {
  getActiveGameSessionForParty,
  getActiveSceneForParty,
  getMarkersForScene,
  getPartyFromSlug,
  getUser
} from '$lib/server';
import { getAnnotationsForScene } from '$lib/server/annotations';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';

  const party = await getPartyFromSlug(params.party);
  if (!party) {
    return redirect(302, '/login');
  }

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  if (!user) {
    return redirect(302, '/login');
  }

  // Get the active game session for this party
  const activeGameSession = await getActiveGameSessionForParty(party.id);

  // Get the active scene for the party (now at party level, not game session level)
  const activeScene = await getActiveSceneForParty(party.id);

  let activeSceneMarkers: SelectMarker[] = [];
  let activeSceneAnnotations: SelectAnnotation[] = [];
  if (activeScene) {
    activeSceneMarkers = await getMarkersForScene(activeScene.id);
    activeSceneAnnotations = await getAnnotationsForScene(activeScene.id);
  }

  return {
    user,
    party,
    activeGameSession,
    activeScene,
    activeSceneMarkers,
    activeSceneAnnotations,
    partykitHost
  };
};
