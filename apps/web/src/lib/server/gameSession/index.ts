import { GITHUB_PR_NUMBER, TURSO_API_TOKEN, VERCEL_ENV } from '$env/static/private';
import { db } from '$lib/db/app';
import { gameSessionTable, type SelectGameSession } from '$lib/db/app/schema';
import { createRandomGameSessionName } from '$lib/utils';
import { createClient } from '@tursodatabase/api';
import { eq } from 'drizzle-orm';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

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

// Function to create a new project database
export const createGameSessionDb = async (partyId: string, gsName?: string) => {
  const turso = createClient({
    org: 'snide',
    token: TURSO_API_TOKEN
  });

  try {
    const gameSessionId = uuidv4();
    const name = gsName || createRandomGameSessionName();
    const slug = slugify(name, { lower: true });
    const prNumber = GITHUB_PR_NUMBER;
    const prefix = VERCEL_ENV === 'preview' ? `pr-${prNumber}-gs-child` : 'gs-child';

    const database = await turso.databases.create(`${prefix}-${gameSessionId}`, {
      group: 'default',
      schema: 'gs-parent-db'
    });

    // Store the project and hashed token in the parent database
    await db.insert(gameSessionTable).values({
      id: gameSessionId,
      name,
      partyId,
      slug,
      dbName: database.name
    });
    return database;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create session database');
  }
};
