import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from '$lib/server';
import { type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session') ?? null;
  if (token === null) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await validateSessionToken(token);
  //  const pathname = event.url.pathname;
  //  const searchParams = event.url.searchParams;
  //  const redirectUrl = searchParams.get('redirect');
  if (session !== null) {
    console.log('Session is valid, setting new expiration date');
    setSessionTokenCookie(event, token);
  } else {
    console.log('Deleting invalid session token cookie');
    deleteSessionTokenCookie(event);

    /* if (pathname.startsWith('/accept-invite/')) {
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
    } else if (redirectUrl) {
      throw redirect(302, redirectUrl);
    } */
  }
  event.locals.session = session;
  event.locals.user = user;
  return resolve(event);
};
