import { getActiveScene, getPartyGameSessionFromSlug } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const { user, party } = await parent();
  if (!party || !user) {
    return redirect(302, '/login');
  }

  // Use party.id to ensure we get the correct game session for this party
  const gameSession = await getPartyGameSessionFromSlug(params.gameSession, party.id);
  if (!gameSession) {
    return redirect(302, '/login');
  }

  const activeScene = await getActiveScene(gameSession.id);

  return {
    gameSession,
    activeScene
  };
}) satisfies LayoutServerLoad;
