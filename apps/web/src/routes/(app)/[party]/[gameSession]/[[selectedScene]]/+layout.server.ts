import { getPartyGameSessionFromSlug, updateParty } from '$lib/server';
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

  // Auto-set this game session as active if no active game session is currently set
  if (!party.activeGameSessionId) {
    try {
      await updateParty(party.id, { activeGameSessionId: gameSession.id });
    } catch (error) {
      console.error('Failed to auto-set active game session:', error);
      // Don't fail the request if this update fails
    }
  }

  return {
    gameSession
  };
}) satisfies LayoutServerLoad;
