import type * as Party from 'partykit/server';

// Server-to-server bridge from PartyKit rooms to the app's /api/internal endpoints.
// Production requires APP_API_URL and INTERNAL_API_TOKEN set as PartyKit vars; dev
// falls back to the local SvelteKit server and the shared dev token.

export const appRequest = async <T>(room: Party.Room, path: string, body: unknown): Promise<T> => {
  const base = (room.env.APP_API_URL as string | undefined) ?? 'http://localhost:5173';
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
