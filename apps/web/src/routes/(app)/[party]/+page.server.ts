import { getPartyFromSlug } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  console.log('params', params);
  const party = await getPartyFromSlug(params.party);
  console.log('party', party);
  return {
    party
  };
}) satisfies PageServerLoad;
