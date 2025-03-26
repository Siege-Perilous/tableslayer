import type { SelectMarker } from '$lib/db/app/schema';
import {
  getActiveScene,
  getMarkersForScene,
  getPartyFromSlug,
  getPartyGameSessionFromSlug,
  getUser
} from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { params } = event;

  const party = await getPartyFromSlug(params.party);
  if (!party) {
    return redirect(302, '/login');
  }

  // Use party.id to ensure we get the correct game session for this party
  const gameSession = await getPartyGameSessionFromSlug(params.gameSession, party.id);

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  if (!user) {
    return redirect(302, '/login');
  }
  if (!gameSession) {
    return redirect(302, '/login');
  }

  const activeScene = await getActiveScene(gameSession.id);
  let activeSceneMarkers: SelectMarker[] = [];

  if (activeScene) {
    activeSceneMarkers = await getMarkersForScene(activeScene.id);
  }

  return {
    user,
    gameSession,
    activeScene,
    activeSceneMarkers
  };
};
