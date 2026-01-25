import { getActiveSceneForParty, getPartyGameSessionFromSlug } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const { user, party } = await parent();

  if (!party || !user) {
    return redirect(302, '/login');
  }

  const [gameSession, activeScene] = await Promise.all([
    getPartyGameSessionFromSlug(params.gameSession, party.id),
    getActiveSceneForParty(party.id)
  ]);

  if (!gameSession) {
    return redirect(302, '/login');
  }

  return {
    gameSession,
    activeScene
  };
}) satisfies LayoutServerLoad;
