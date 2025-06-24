import { getRecentParty } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    const userId = event.locals.user.id;
    const recentParty = await getRecentParty(userId);
    if (recentParty) {
      return redirect(302, `/${recentParty.slug}`);
    }
    return redirect(302, '/profile');
  }

  return {
    envName: process.env.ENV_NAME || 'development'
  };
};
