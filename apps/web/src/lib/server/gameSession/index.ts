import { db } from '$lib/db/app';
import { gameSessionTable, type InsertGameSession, type SelectGameSession } from '$lib/db/app/schema';
import { gsChildDb } from '$lib/db/gs';
import { settingsTable, type SelectGameSettings } from '$lib/db/gs/schema';
import { SlugConflictError } from '$lib/server';
import { createRandomGameSessionName } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { createClient } from '@tursodatabase/api';
import { eq } from 'drizzle-orm';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { createScene } from '../scene';

const turso = createClient({
  org: 'snide',
  token: process.env.TURSO_API_TOKEN!
});

export const getPartyGameSessions = async (partyId: string): Promise<SelectGameSession[]> => {
  const gameSessions = await db.select().from(gameSessionTable).where(eq(gameSessionTable.partyId, partyId)).all();
  return gameSessions;
};

export const getPartyGameSessionFromSlug = async (slug: string) => {
  const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.slug, slug)).get();
  if (!gameSession) {
    error(404, 'Game session not found');
  }
  return gameSession;
};

export const deleteGameSession = async (id: string) => {
  try {
    const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.id, id)).get();
    if (!gameSession) {
      throw new Error('Game session not found');
    }
    const databaseName = gameSession.dbName;
    await db.delete(gameSessionTable).where(eq(gameSessionTable.id, id)).run();
    await turso.databases.delete(databaseName);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// Don't allow sessions within the same party to have the same slug
// This is so we have very nice URLs like /party-name/game-session-name
export const checkForGameSessionSlugConflict = async (partyId: string, slug: string) => {
  const existingGameSessions = await getPartyGameSessions(partyId);
  if (existingGameSessions.some((gs) => gs.slug === slug)) {
    throw new SlugConflictError('Game session with that name already exists');
  }
};

// Function to create a new project database
export const createGameSessionDb = async (partyId: string, gameSessionData?: Partial<InsertGameSession>) => {
  try {
    const gameSessionId = uuidv4();
    const name = (gameSessionData && gameSessionData.name) || createRandomGameSessionName();
    const slug = slugify(name, { lower: true });
    const prBranch = process.env.GITHUB_PR_NUMBER!;
    const prefix = process.env.ENV_NAME! === 'preview' ? `pr-${prBranch}-gs-child` : 'gs-child';

    await checkForGameSessionSlugConflict(partyId, slug);

    const database = await turso.databases.create(`${prefix}-${gameSessionId}`, {
      group: 'default',
      schema: 'gs-parent'
    });

    // Store the project and hashed token in the parent database
    await db
      .insert(gameSessionTable)
      .values({
        ...gameSessionData,
        id: gameSessionId,
        name,
        partyId,
        slug,
        dbName: database.name
      })
      .execute();

    // Create the initial scene, and set it as active within settings
    await createScene(database.name, { name: 'First scene' });

    return database;
  } catch (error) {
    console.error('Error creating game session', error);
    throw error;
  }
};

export const renameGameSession = async (partyId: string, gameSessionId: string, newName: string) => {
  try {
    const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.id, gameSessionId)).get();
    const slug = slugify(newName, { lower: true });
    if (!gameSession) {
      throw new Error('Game session not found');
    }

    await checkForGameSessionSlugConflict(partyId, slug);

    const renamedGameSession = await db
      .update(gameSessionTable)
      .set({
        name: newName,
        slug
      })
      .where(eq(gameSessionTable.id, gameSessionId))
      .run();
    return renamedGameSession;
  } catch (error) {
    console.error('Error creating game session', error);
    throw error;
  }
};

export const updateGameSessionSettings = async (dbName: string, settings: Partial<SelectGameSettings>) => {
  const gsDb = gsChildDb(dbName);

  // Construct update object dynamically
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length > 0) {
    await gsDb.update(settingsTable).set(updateData).where(eq(settingsTable.id, settingsTable)).execute();
  }
};
