import { db } from '$lib/db';
import { scenesTable, usersTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  let user = null;
  if (event.locals.user) {
    const userId = event.locals.user.id;
    user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).get();
  }

  const scenes = await db.select().from(scenesTable);
  return {
    user,
    scenes
  };
}) satisfies PageServerLoad;
