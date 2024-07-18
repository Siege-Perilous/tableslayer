import { getPartyFromSlug } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params }) => {
  //  console.log('params', params);
  const party = await getPartyFromSlug(params.party);
  //  console.log('party page', party);
  return {
    party
  };
}) satisfies LayoutServerLoad;
