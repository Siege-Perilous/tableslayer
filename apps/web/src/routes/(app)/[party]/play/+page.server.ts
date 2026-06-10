import {
  getActiveGameSessionForParty,
  getActiveSceneForParty,
  getPartyFromSlug,
  getPartyGameSessions,
  getUser
} from '$lib/server';
import { getSceneList } from '$lib/server/scene';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Shell-only load: auth, party, session routing data, and the active scene row so
// the map image starts downloading in parallel with the realtime connection.
// All live scene content (markers, lights, annotations, masks) comes from the
// session doc once connected — the DB is not part of the realtime loop.
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

  const user = await getUser(event.locals.user.id);
  if (!user) {
    return redirect(302, '/login');
  }

  const [activeGameSession, allGameSessions, activeScene] = await Promise.all([
    getActiveGameSessionForParty(party.id),
    getPartyGameSessions(party.id),
    getActiveSceneForParty(party.id)
  ]);

  // Lightweight scene routing list (id + name per session) for the radial menu
  // and for resolving which session room a scene lives in.
  const gameSessionsWithScenes = await Promise.all(
    allGameSessions.map(async (gs) => ({
      id: gs.id,
      name: gs.name,
      scenes: await getSceneList(gs.id)
    }))
  );

  return {
    user,
    party,
    activeGameSession,
    gameSessionsWithScenes,
    activeScene,
    partykitHost
  };
};
