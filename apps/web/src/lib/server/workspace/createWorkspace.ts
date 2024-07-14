import { db } from '$lib/db';
import { workspaceTable, type SelectWorkspace } from '$lib/db/schema';
import { createRandomName, generateSlug } from '$lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface CustomError extends Error {
  code?: string;
}

export const createRandomNamedWorkspace = async (): Promise<SelectWorkspace> => {
  let workspaceName = createRandomName();
  let isWorkspaceNameUnique = false;

  while (!isWorkspaceNameUnique) {
    const slug = generateSlug(workspaceName);

    try {
      const workspace = await db
        .insert(workspaceTable)
        .values({
          id: uuidv4(),
          name: workspaceName,
          slug
        })
        .returning()
        .get();

      isWorkspaceNameUnique = true;
      return workspace;
    } catch (error) {
      const customError = error as CustomError;
      if (customError.code === 'SQLITE_CONSTRAINT_UNIQUE' || customError.code === '23505') {
        // Handle unique constraint violation
        workspaceName = createRandomName(); // Generate a new name and try again
      } else {
        throw error; // Rethrow other errors
      }
    }
  }

  // This return is here to satisfy TypeScript, but logically this should never be reached.
  throw new Error('Failed to create a unique workspace name');
};
