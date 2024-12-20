import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from '$lib/server';
import { type Handle } from '@sveltejs/kit';

import { Server } from 'socket.io';
import { useServer } from 'vite-sveltekit-node-ws';

useServer(
  (server) => {
    const wsServer = new Server(server);
    wsServer.of('hello').on('connect', (ws) => {
      ws.on('hello', (e) => {
        ws.emit('echo', `echo: ${e}`);
      });
    });
  },
  (path) => /socket\.io|hello/.test(path)
);

export const handle: Handle = async ({ event, resolve }) => {
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
};
