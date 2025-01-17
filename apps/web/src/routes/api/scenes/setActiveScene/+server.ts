import { isUserInParty, setActiveScene } from '$lib/server';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
  const { request, locals } = event;
  try {
    const { dbName, sceneId, partyId } = (await request.json()) as {
      dbName: string;
      sceneId: string;
      partyId: string;
    };

    if (!locals.user.id || !isUserInParty(locals.user.id, partyId)) {
      throw error(401, 'Unauthorized request - not a member of this party.');
    }

    if (!dbName || !sceneId) {
      throw error(400, 'dbName and sceneId are required.');
    }

    await setActiveScene(dbName, sceneId);

    return json({ success: true });
  } catch (err) {
    console.error('Failed to set active scene:', err);
    throw error(500, 'Failed to set active scene');
  }
};
