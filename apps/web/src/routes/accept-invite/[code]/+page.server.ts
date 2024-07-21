import { getPartyInvitesForCode } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  //  if (event.locals.user) redirect(302, '/profile');
  const { user } = await parent();
  if (user) {
    return redirect(302, '/profile');
  }
  const code = params.code;
  const invites = await getPartyInvitesForCode(code);
  return {
    invites
  };
};
