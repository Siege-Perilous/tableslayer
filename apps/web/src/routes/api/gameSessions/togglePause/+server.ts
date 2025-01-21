import { isUserInParty, toggleGamePause } from '$lib/server';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
  const { request, locals } = event;
  console.log('Toggling game pause');
  try {
    const { dbName, partyId } = (await request.json()) as { dbName: string; partyId: string };
    console.log('Toggling game pause for', dbName, partyId);

    if (!locals.user.id || !partyId || !isUserInParty(locals.user.id, partyId)) {
      throw error(401, 'Unauthorized request - not a member of this party.');
    }
    if (!dbName) {
      throw error(400, 'dbName is required.');
    }
    await toggleGamePause(dbName);
    return json({ success: true });
  } catch (err) {
    console.error('Failed to toggle game pause:', err);
    throw error(500, 'Failed to toggle game pause');
  }
};
