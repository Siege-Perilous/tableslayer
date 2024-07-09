import { db } from '$lib/db';
import { usersTable } from '$lib/db/schema';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load = (async (event) => {
  if (!event.locals.user) redirect(302, '/login');

  const userId = event.locals.user.id;
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).get();

  return {
    user
  };
}) satisfies LayoutServerLoad;
