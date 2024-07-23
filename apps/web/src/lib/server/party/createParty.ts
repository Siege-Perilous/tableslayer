import { db } from '$lib/db/app';
import { partyTable, type SelectParty } from '$lib/db/app/schema';
import { createRandomName, generateSlug } from '$lib/utils';
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
