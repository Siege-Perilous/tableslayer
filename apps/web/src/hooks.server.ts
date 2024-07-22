import { getPartyInvitesForCode, isEmailInUserTable } from '$lib/server';
import { lucia } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(lucia.sessionCookieName);
  const pathname = event.url.pathname;
  const searchParams = event.url.searchParams;
  const redirectUrl = searchParams.get('redirect');

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;

    // Logged out users get redirected to login or signup
    if (pathname.startsWith('/accept-invite/')) {
      const inviteCode = pathname.split('/').pop() as string;
      const inviteEmail = await getPartyInvitesForCode(inviteCode);
      if (inviteEmail) {
        const userExists = await isEmailInUserTable(inviteEmail.invite.email);
        const redirectUrl = `/accept-invite/${inviteCode}`;
        if (userExists) {
          throw redirect(302, `/login?redirect=${redirectUrl}`);
        } else {
          throw redirect(302, `/signup?redirect=${redirectUrl}`);
        }
      }
    }
    return resolve(event);
  }

  const { session, user } = await lucia.validateSession(sessionId);
  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    // sveltekit types deviates from the de-facto standard
    // you can use 'as any' too
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }
  event.locals.user = user;
  event.locals.session = session;

  // Logged in get redirected to profile
  if (pathname.startsWith('/accept-invite/') && user) {
    throw redirect(302, `/profile`);
  }

  // Redirect to the original URL after login
  if (redirectUrl) {
    throw redirect(302, redirectUrl);
  }

  return resolve(event);
};
