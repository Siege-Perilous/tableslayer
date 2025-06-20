import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/db/app/index.js';
import { gameSessionTable, sceneTable } from '../../../../lib/db/app/schema.js';
import { isUserInParty } from '../../../../lib/server/party/index.js';

export async function POST({ request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gameSessionId, partyId } = await request.json();

    if (!gameSessionId || !partyId) {
      return json({ error: 'Missing gameSessionId or partyId' }, { status: 400 });
    }

    // Check if user is in the party
    const userInParty = await isUserInParty(user.id, partyId);
    if (!userInParty) {
      return json({ error: 'User not in party' }, { status: 403 });
    }

    // Verify the game session belongs to the party
    const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.id, gameSessionId)).get();

    if (!gameSession || gameSession.partyId !== partyId) {
      return json({ error: 'Game session not found or not in party' }, { status: 404 });
    }

    // Get timestamps for all scenes in the game session
    const scenes = await db
      .select({
        id: sceneTable.id,
        lastUpdated: sceneTable.lastUpdated
      })
      .from(sceneTable)
      .where(eq(sceneTable.gameSessionId, gameSessionId));

    // Convert to timestamp map
    const timestamps: Record<string, number> = {};
    for (const scene of scenes) {
      if (scene.lastUpdated) {
        timestamps[scene.id] = scene.lastUpdated.getTime();
      }
    }

    return json({ timestamps });
  } catch (error) {
    console.error('Error fetching scene timestamps:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
