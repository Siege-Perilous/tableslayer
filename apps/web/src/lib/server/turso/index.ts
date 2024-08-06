import { db } from '$lib/db/app'; // Main application DB
import { gameSessionTable } from '$lib/db/app/schema';
import { createRandomGameSessionName } from '$lib/utils';
import { createClient } from '@tursodatabase/api';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

// Function to create a new project database
export const createGameSessionDb = async (partyId: string, gsName?: string) => {
  const turso = createClient({
    org: 'snide',
    token: process.env.TURSO_API_TOKEN!
  });

  try {
    const gameSessionId = uuidv4();
    const name = gsName || createRandomGameSessionName();
    const slug = slugify(name, { lower: true });

    const database = await turso.databases.create(`gs-child-${gameSessionId}`, {
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
