import { db } from '$lib/db/app';
import { usersTable } from '$lib/db/app/schema';
import { eq } from 'drizzle-orm';

export const getUser = async (userId: string) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).get();
  return user;
};

export const isEmailInUserTable = async (email: string) => {
  const isExistingUser = (await db.select().from(usersTable).where(eq(usersTable.email, email)).get()) !== undefined;
  return isExistingUser;
};
