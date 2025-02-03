import { db } from '$lib/db/app';
import { gameSessionTable, partyMemberTable, partyTable, type InsertParty, type SelectParty } from '$lib/db/app/schema';
import { SlugConflictError, deleteGameSession } from '$lib/server';
import { createRandomName, generateSlug } from '$lib/utils';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface CustomError extends Error {
  code?: string;
}

export const createParty = async (userId: string, partyData?: Partial<InsertParty>): Promise<SelectParty> => {
  let isPartyNameUnique = false;
  let partyName = partyData?.name || createRandomName();

  while (!isPartyNameUnique) {
    try {
      const slug = generateSlug(partyName);
      const id = uuidv4();

      // Attempt to create the party
      const party = await db
        .insert(partyTable)
        .values({
          ...partyData,
          id,
          name: partyName,
          slug
        })
        .returning()
        .get();

      // Add the user as the admin
      await db
        .insert(partyMemberTable)
        .values({
          partyId: id,
          userId,
          role: 'admin'
        })
        .execute();

      isPartyNameUnique = true;
      return party;
    } catch (error) {
      const customError = error as CustomError;
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        // Construct a new ZodError that points to "slug" as the invalid field
        throw new SlugConflictError('Name is already taken.');
      }

      if (customError.code === 'SQLITE_CONSTRAINT_UNIQUE' || customError.code === '23505') {
        // If the error is due to a unique constraint violation
        if (partyData?.name) {
          // If the user provided the name, throw an error
          throw new SlugConflictError('Name is already in use.');
        } else {
          // If the name was generated, try again with a new random name
          partyName = createRandomName();
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error('Unexpected error: Unable to create party'); // Fallback error (should never reach here)
};

export const createRandomNamedParty = async (): Promise<SelectParty> => {
  let partyName = createRandomName();
  let isPartyNameUnique = false;

  while (!isPartyNameUnique) {
    const slug = generateSlug(partyName);

    try {
      const party = await db
        .insert(partyTable)
        .values({
          id: uuidv4(),
          name: partyName,
          slug
        })
        .returning()
        .get();

      isPartyNameUnique = true;
      return party;
    } catch (error) {
      const customError = error as CustomError;
      if (customError.code === 'SQLITE_CONSTRAINT_UNIQUE' || customError.code === '23505') {
        // Handle unique constraint violation
        partyName = createRandomName(); // Generate a new name and try again
      } else {
        throw error; // Rethrow other errors
      }
    }
  }

  // This return is here to satisfy TypeScript, but logically this should never be reached.
  throw new Error('Failed to create a unique party name');
};

export const createNamedPartyForUser = async (
  userId: string,
  partyName: string,
  avatarFileId?: number
): Promise<SelectParty> => {
  const slug = generateSlug(partyName);
  const partyId = uuidv4();

  try {
    const party = await db
      .insert(partyTable)
      .values({
        id: partyId,
        name: partyName,
        slug,
        avatarFileId: avatarFileId || 1
      })
      .returning()
      .get();

    await db
      .insert(partyMemberTable)
      .values({
        partyId: partyId,
        userId,
        role: 'admin'
      })
      .execute();

    return party;
  } catch (error) {
    const customError = error as CustomError;
    if (customError.code === 'SQLITE_CONSTRAINT_UNIQUE' || customError.code === '23505') {
      throw new Error('Party name is not unique');
    } else {
      throw error;
    }
  }
};

export const updatePartyAvatar = async (partyId: string, avatarFileId: number): Promise<SelectParty> => {
  try {
    const party = await db.update(partyTable).set({ avatarFileId }).where(eq(partyTable.id, partyId)).returning().get();
    return party;
  } catch (error) {
    console.error('Error updating party avatar', error);
    throw error;
  }
};

export const deleteParty = async (partyId: string): Promise<boolean> => {
  try {
    // get game session database namee in the party
    const gameSessions = await db.select().from(gameSessionTable).where(eq(gameSessionTable.partyId, partyId));
    const gameSessionIds = gameSessions.map((session) => session.id);

    // delete the game session rows and turso databases
    for (const gameSessionId of gameSessionIds) {
      await deleteGameSession(gameSessionId);
    }

    await db.delete(partyTable).where(eq(partyTable.id, partyId)).execute();
    return true;
  } catch (error) {
    console.error('Error deleting party', error);
    return false;
  }
};

export const renameParty = async (partyId: string, name: string): Promise<SelectParty> => {
  try {
    const slug = generateSlug(name);
    const party = await db.update(partyTable).set({ name, slug }).where(eq(partyTable.id, partyId)).returning().get();
    return party;
  } catch (error) {
    console.error('Error renaming party', error);
    throw error;
  }
};

type PartialInsertParty = Partial<InsertParty>;

export const updateParty = async (partyId: string, updates: PartialInsertParty): Promise<SelectParty> => {
  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided.');
  }

  // Ensure slug is updated if name is changed
  if (updates.name && !updates.slug) {
    updates.slug = generateSlug(updates.name);
  }

  try {
    const party = await db.update(partyTable).set(updates).where(eq(partyTable.id, partyId)).returning().get();

    console.log(`Party ${partyId} updated successfully.`);
    return party;
  } catch (error: unknown) {
    // Check if Drizzle/SQLite complained about a unique constraint
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: party.slug')) {
      // Construct a new ZodError that points to "slug" as the invalid field
      throw new SlugConflictError('Name is already taken.');
    }
    throw new Error('Failed to update party.');
  }
};
