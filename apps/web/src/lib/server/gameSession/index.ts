import { db } from '$lib/db/app';
import { gameSessionTable, type SelectGameSession } from '$lib/db/app/schema';
import { eq } from 'drizzle-orm';

export const getPartyGameSessions = async (partyId: string): Promise<SelectGameSession[]> => {
  const gameSessions = await db.select().from(gameSessionTable).where(eq(gameSessionTable.partyId, partyId)).all();
  return gameSessions;
};

export const getPartyGameSessionFromSlug = async (slug: string) => {
  const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.slug, slug)).get();
  return gameSession;
};

export const deletePartyGameSession = async (id: string) => {
  try {
    await db.delete(gameSessionTable).where(eq(gameSessionTable.id, id)).run();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
