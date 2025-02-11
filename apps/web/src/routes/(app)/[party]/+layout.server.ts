import {
  getPartyFromSlug,
  getPartyGameSessionsWithScenes,
  getPartyMembers,
  isUserAdminInParty,
  isUserInParty
} from '$lib/server';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const party = await getPartyFromSlug(params.party);
  const { user } = await parent();
  if (!party || !user) {
    return redirect(302, '/login');
  }

  const isUserInPartyResult = await isUserInParty(user.id, party.id);
  if (!isUserInPartyResult) {
    throw error(404, 'Not found');
  }

  const gameSessions = (await getPartyGameSessionsWithScenes(party.id)) || [];
  const isPartyAdmin = await isUserAdminInParty(user.id, party.id);
  const members = (await getPartyMembers(party.id)) || [];

  return {
    members,
    gameSessions,
    party,
    isPartyAdmin
  };
}) satisfies LayoutServerLoad;
