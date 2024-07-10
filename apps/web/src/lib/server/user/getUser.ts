import { db } from '$lib/db';
import { usersTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const getUser = async (userId: string) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).get();
  return user;
};
