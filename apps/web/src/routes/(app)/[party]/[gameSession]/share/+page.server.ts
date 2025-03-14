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
  const gameSession = await getPartyGameSessionFromSlug(params.gameSession);

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  if (!party || !user) {
    return redirect(302, '/login');
  }
  if (!party || !gameSession || !user) {
    return redirect(302, '/login');
  }

  const activeScene = await getActiveScene(gameSession.id);
  if (!activeScene) {
    redirect(302, '/');
  }
  const activeSceneMarkers = await getMarkersForScene(activeScene.id);

  return {
    user,
    gameSession,
    activeScene,
    activeSceneMarkers
  };
};
