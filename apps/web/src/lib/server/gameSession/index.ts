import { db } from '$lib/db/app';
import {
  gameSessionTable,
  partyTable,
  sceneTable,
  type InsertGameSession,
  type SelectGameSession,
  type SelectScene
} from '$lib/db/app/schema';
import { SlugConflictError, transformImage } from '$lib/server';
import { createRandomGameSessionName } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import type { Thumb } from '../file';
import { createScene } from '../scene';

export const getPartyGameSessions = async (partyId: string): Promise<SelectGameSession[]> => {
  const gameSessions = await db
    .select()
    .from(gameSessionTable)
    .where(eq(gameSessionTable.partyId, partyId))
    .orderBy(desc(gameSessionTable.lastUpdated))
    .all();
  return gameSessions;
};

export const getPartyGameSessionsWithScenes = async (partyId: string) => {
  const gameSessions = await getPartyGameSessions(partyId);

  const gameSessionsWithScenes = await Promise.all(
    gameSessions.map(async (gameSession) => {
      const scenes = await db.select().from(sceneTable).where(eq(sceneTable.gameSessionId, gameSession.id)).limit(5);

      const scenesWithThumbs: (SelectScene & Thumb)[] = [];

      for (const scene of scenes) {
        if (scene.mapLocation) {
          const thumb = await transformImage(
            scene.mapThumbLocation || scene.mapLocation,
            'w=400,h=225,fit=cover,gravity=center'
          );

          const thumbWithCacheBusting = {
            ...thumb,
            resizedUrl: `${thumb.resizedUrl}?t=${Date.now()}`
          };
          const sceneWithThumb = { ...scene, thumb: thumbWithCacheBusting } as SelectScene & Thumb;
          scenesWithThumbs.push(sceneWithThumb);
        }
      }
      return {
        ...gameSession,
        scenes: scenesWithThumbs
      };
    })
  );
  return gameSessionsWithScenes;
};

export const getGameSession = async (gameSessionId: string): Promise<SelectGameSession> => {
  const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.id, gameSessionId)).get();
  if (!gameSession) {
    error(404, 'Game session not found');
  }
  return gameSession;
};

export const getPartyGameSessionFromSlug = async (slug: string, partyId?: string) => {
  // If partyId is provided, use it to filter by both slug and partyId
  const query = partyId
    ? and(eq(gameSessionTable.slug, slug), eq(gameSessionTable.partyId, partyId))
    : eq(gameSessionTable.slug, slug);

  const gameSession = await db.select().from(gameSessionTable).where(query).get();
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
    await db.delete(gameSessionTable).where(eq(gameSessionTable.id, id)).run();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// Don't allow sessions within the same party to have the same slug
// This is so we have very nice URLs like /party-name/game-session-name
export const checkForGameSessionSlugConflict = async (partyId: string, slug: string, gameSessionId?: string) => {
  const existingGameSessions = await getPartyGameSessions(partyId);

  if (existingGameSessions.some((gs) => gs.slug === slug && gs.id !== gameSessionId)) {
    throw new SlugConflictError('Game session with that name already exists');
  }
};

// Function to create a new project database
export const createGameSession = async (partyId: string, gameSessionData?: Partial<InsertGameSession>) => {
  try {
    const gameSessionId = uuidv4();
    const name = (gameSessionData && gameSessionData.name) || createRandomGameSessionName();
    const slug = slugify(name, { lower: true });

    await checkForGameSessionSlugConflict(partyId, slug);

    // Store the project and hashed token in the parent database
    const gameSession = await db
      .insert(gameSessionTable)
      .values({
        ...gameSessionData,
        id: gameSessionId,
        name,
        partyId,
        slug
      })
      .returning()
      .get();

    // Create the initial scene, and set it as active within settings
    await createScene({ name: 'First scene', gameSessionId });

    return gameSession;
  } catch (error) {
    console.error('Error creating game session', error);
    throw error;
  }
};

export const updateGameSession = async (gameSessionId: string, gameSessionData: Partial<InsertGameSession>) => {
  try {
    const gameSession = await db.select().from(gameSessionTable).where(eq(gameSessionTable.id, gameSessionId)).get();
    if (!gameSession) {
      throw new Error('Game session not found');
    }

    if (gameSessionData.name) {
      const newSlug = slugify(gameSessionData.name, { lower: true });
      await checkForGameSessionSlugConflict(gameSession.partyId, newSlug, gameSessionId);
      gameSessionData.slug = newSlug;
    }

    await db.update(gameSessionTable).set(gameSessionData).where(eq(gameSessionTable.id, gameSessionId)).execute();

    return true;
  } catch (error) {
    console.error('Error updating game session', error);
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

// Function for importing game sessions - does not create an initial scene
export const createGameSessionForImport = async (partyId: string, gameSessionData?: Partial<InsertGameSession>) => {
  try {
    const gameSessionId = uuidv4();
    const name = (gameSessionData && gameSessionData.name) || createRandomGameSessionName();
    const slug = slugify(name, { lower: true });

    await checkForGameSessionSlugConflict(partyId, slug);

    // Store the project and hashed token in the parent database
    const gameSession = await db
      .insert(gameSessionTable)
      .values({
        ...gameSessionData,
        id: gameSessionId,
        name,
        partyId,
        slug
      })
      .returning()
      .get();

    // No initial scene is created for imports
    return gameSession;
  } catch (error) {
    console.error('Error creating game session for import', error);
    throw error;
  }
};

export const getActiveGameSessionForParty = async (partyId: string): Promise<SelectGameSession | null> => {
  const party = await db.select().from(partyTable).where(eq(partyTable.id, partyId)).get();
  if (!party || !party.activeSceneId) {
    return null;
  }

  // Find the game session that contains the active scene
  const scene = await db.select().from(sceneTable).where(eq(sceneTable.id, party.activeSceneId)).get();
  if (!scene) {
    return null;
  }

  const activeGameSession = await getGameSession(scene.gameSessionId);
  return activeGameSession;
};
