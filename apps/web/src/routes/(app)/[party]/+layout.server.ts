import { getPartyFromSlug, isUserAdminInParty } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
  //  console.log('params', params);
  const party = await getPartyFromSlug(params.party);
  //  console.log('party page', party);
  const { user } = await parent();
  if (!party || !user) {
    // 404
    return;
  }

  const isPartyAdmin = await isUserAdminInParty(user.id, party.id);
  return {
    party,
    isPartyAdmin
  };
}) satisfies LayoutServerLoad;
