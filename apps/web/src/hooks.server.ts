import { deleteSessionTokenCookie, initializeSocketIO, setSessionTokenCookie, validateSessionToken } from '$lib/server';
import * as Sentry from '@sentry/sveltekit';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { useServer } from 'vite-sveltekit-node-ws';

if (process.env.ENV_NAME === 'production') {
  Sentry.init({
    dsn: 'https://f027207d962eb65a32305ca8824d26f1@o4508673215430656.ingest.us.sentry.io/4508673215758336',
    tracesSampleRate: 1,
    beforeSend(event) {
      // Exclude WebSocket-related events from being sent to Sentry
      if (event.request?.url?.includes('/socket.io') || event.request?.url?.includes('/gameSession')) {
        return null;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Exclude WebSocket-related breadcrumbs
      if (breadcrumb.category === 'xhr' && breadcrumb.data?.url?.includes('/socket.io')) {
        return null;
      }
      return breadcrumb;
    }
  });
}

// Initialize WebSocket server
useServer(
  (server) => {
    initializeSocketIO(server);
  },
  (path) => /socket\.io|gameSession/.test(path)
);

export const handle: Handle = sequence(
  async ({ event, resolve }) => {
    // Exclude WebSocket requests from Sentry's middleware
    if (event.url.pathname.includes('/socket.io') || event.url.pathname.includes('/gameSession')) {
      return resolve(event); // Skip Sentry handling for WebSocket traffic
    }
    return Sentry.sentryHandle()({ event, resolve });
  },
  async ({ event, resolve }) => {
    const token = event.cookies.get('session') ?? null;
    if (token === null) {
      console.log('No session token found');
      event.locals.user = null;
      event.locals.session = null;
      return resolve(event);
    }

    const { session, user } = await validateSessionToken(token);
    if (session !== null) {
      console.log('Session is valid, setting new expiration date');
      setSessionTokenCookie(event, token);
    } else {
      console.log('Deleting invalid session token cookie');
      deleteSessionTokenCookie(event);
    }
    event.locals.session = session;
    event.locals.user = user;
    return resolve(event);
  }
);

// Handle errors with Sentry
export const handleError = Sentry.handleErrorWithSentry();
