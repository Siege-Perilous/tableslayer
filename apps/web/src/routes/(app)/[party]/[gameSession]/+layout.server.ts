import { getActiveScene, getGameSettings, getPartyGameSessionFromSlug } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const gameSession = await getPartyGameSessionFromSlug(params.gameSession);
  const { user, party } = await parent();
  if (!party || !gameSession || !user) {
    return redirect(302, '/login');
  }

  const gameSettings = await getGameSettings(gameSession.dbName);
  const activeScene = await getActiveScene(gameSession.dbName);

  return {
    gameSettings,
    gameSession,
    activeScene
  };
}) satisfies LayoutServerLoad;
