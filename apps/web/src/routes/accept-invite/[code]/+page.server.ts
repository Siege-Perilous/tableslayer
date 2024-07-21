import { getPartyInvitesForCode } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { user } = await parent();
  if (user) {
    return redirect(302, '/profile');
  }
  // @ts-expect-error - params is not typed
  const code = params.code;
  const invite = await getPartyInvitesForCode(code);
  return {
    invite
  };
};
