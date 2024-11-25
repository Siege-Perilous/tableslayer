import { db } from '$lib/db/app';
import { partyMemberTable, partyTable, type SelectParty } from '$lib/db/app/schema';
import { createRandomName, generateSlug } from '$lib/utils';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface CustomError extends Error {
  code?: string;
}

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
