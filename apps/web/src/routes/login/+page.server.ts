import {
  createSession,
  generateSessionToken,
  getRecentParty,
  setSessionTokenCookie,
  validateApiKey
} from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  // Check for API key login
  const apiKey = event.url.searchParams.get('key');
  const redirectPath = event.url.searchParams.get('redirect');

  if (apiKey) {
    const result = await validateApiKey(apiKey);

    if (result) {
      // Create session and set cookie
      const token = generateSessionToken();
      await createSession(token, result.user.id);
      setSessionTokenCookie(event, token);

      // Redirect to specified path or profile
      return redirect(302, redirectPath || '/profile');
    }

    // Invalid key - return error to display on login page
    const parentData = await event.parent();
    return {
      envName: parentData.envName,
      keyError: 'Invalid API key'
    };
  }

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
