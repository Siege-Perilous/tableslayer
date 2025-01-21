import { deleteSessionTokenCookie, initializeSocketIO, setSessionTokenCookie, validateSessionToken } from '$lib/server';
import * as Sentry from '@sentry/sveltekit';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { useServer } from 'vite-sveltekit-node-ws';

if (process.env.ENV_NAME === 'production') {
  Sentry.init({
    dsn: 'https://f027207d962eb65a32305ca8824d26f1@o4508673215430656.ingest.us.sentry.io/4508673215758336',
    tracesSampleRate: 1
  });
}

useServer(
  (server) => {
    initializeSocketIO(server);
  },
  (path) => /^\/(socket\.io|gameSession\/socket)/.test(path)
);

export const handle: Handle = sequence(Sentry.sentryHandle(), async ({ event, resolve }) => {
  const contentLength = event.request.headers.get('content-length');

  if (contentLength) {
    const sizeInBytes = parseInt(contentLength, 10);
    const maxSizeInBytes = 20 * 1024 * 1024; // 20 MB

    if (sizeInBytes > maxSizeInBytes) {
      return new Response('Payload Too Large', { status: 413 });
    }
  }
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
