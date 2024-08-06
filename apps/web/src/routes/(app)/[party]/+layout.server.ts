import { getPartyFromSlug, getPartyGameSessions, getPartyMembers, isUserAdminInParty } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const party = await getPartyFromSlug(params.party);
  const { user } = await parent();
  if (!party || !user) {
    return redirect(302, '/login');
  }

  const gameSessions = (await getPartyGameSessions(party.id)) || [];

  const isPartyAdmin = await isUserAdminInParty(user.id, party.id);

  const members = (await getPartyMembers(party.id)) || [];

  return {
    members,
    gameSessions,
    party,
    isPartyAdmin
  };
}) satisfies LayoutServerLoad;
