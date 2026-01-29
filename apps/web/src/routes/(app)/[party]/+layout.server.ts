import {
  getPartyFromSlug,
  getPartyGameSessions,
  getPartyMembers,
  isUserAdminInParty,
  isUserInParty
} from '$lib/server';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  const [party, { user }] = await Promise.all([getPartyFromSlug(params.party), parent()]);

  if (!party || !user) {
    return redirect(302, '/login');
  }

  const isUserInPartyResult = await isUserInParty(user.id, party.id);

  if (!isUserInPartyResult) {
    throw error(404, 'Not found');
  }

  // Load lightweight session list for nav dropdown (no scenes/thumbnails)
  // Dashboard page loads full sessions with thumbnails separately
  const [isPartyAdmin, members, gameSessions] = await Promise.all([
    isUserAdminInParty(user.id, party.id),
    getPartyMembers(party.id),
    getPartyGameSessions(party.id)
  ]);

  return {
    members: members || [],
    gameSessions: gameSessions || [],
    party,
    isPartyAdmin
  };
}) satisfies LayoutServerLoad;
