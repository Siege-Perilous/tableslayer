import type * as Party from 'partykit/server';

// Server-to-server bridge from PartyKit rooms to the app's /api/internal endpoints.
// Deployments must set BASE_URL (the app's URL, same value the app itself uses)
// and INTERNAL_API_TOKEN as PartyKit vars; dev falls back to the local SvelteKit
// server and the shared dev token. APP_API_URL remains as an explicit override.

export const appRequest = async <T>(room: Party.Room, path: string, body: unknown): Promise<T> => {
  // 5174 is the web app's pinned dev port (apps/web/vite.config.ts)
  const configured = (room.env.APP_API_URL ?? room.env.BASE_URL) as string | undefined;
  // partykit dev reads the app's .env; tolerate a https://localhost BASE_URL there
  const base = (configured ?? 'http://localhost:5174').replace(/^https:\/\/(localhost|127\.)/, 'http://$1');
  const token = (room.env.INTERNAL_API_TOKEN as string | undefined) ?? 'dev-internal-token';

  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': token
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
};
