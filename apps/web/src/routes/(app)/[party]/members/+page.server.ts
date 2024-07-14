import { getPartyMembers } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load = (async ({ parent }) => {
  const { party } = await parent();

  if (!party) {
    throw new Error('Party is undefined');
  }

  const members = (await getPartyMembers(party.id)) || [];

  console.log('members', members);

  return {
    members
  };
}) satisfies PageServerLoad;
