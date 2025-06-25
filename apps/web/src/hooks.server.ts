import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from '$lib/server';
import * as Sentry from '@sentry/sveltekit';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

if (process.env.ENV_NAME === 'production') {
  Sentry.init({
    dsn: 'https://f027207d962eb65a32305ca8824d26f1@o4508673215430656.ingest.us.sentry.io/4508673215758336',
    tracesSampleRate: 1
  });
}

export const handle: Handle = sequence(Sentry.sentryHandle(), async ({ event, resolve }) => {
  const token = event.cookies.get('session') ?? null;
  if (token === null) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await validateSessionToken(token);
  if (session !== null) {
    setSessionTokenCookie(event, token);
  } else {
    deleteSessionTokenCookie(event);
  }
  event.locals.session = session;
  event.locals.user = user;
  return resolve(event);
});
export const handleError = Sentry.handleErrorWithSentry();
