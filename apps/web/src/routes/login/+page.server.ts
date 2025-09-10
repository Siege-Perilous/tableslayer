import { getRecentParty } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    const userId = event.locals.user.id;

    // Check for redirect cookie
    const redirectUrl = event.cookies.get('redirect_after_login');
    if (redirectUrl) {
      // Clear the redirect cookie
      event.cookies.delete('redirect_after_login', { path: '/' });
      return redirect(302, redirectUrl);
    }

    const recentParty = await getRecentParty(userId);
    if (recentParty) {
      return redirect(302, `/${recentParty.slug}`);
    }
    return redirect(302, '/profile');
  }

  // Get envName from parent layout
  const parentData = await event.parent();
  return {
    envName: parentData.envName
  };
};
