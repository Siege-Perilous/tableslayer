import { appDb, usersTable } from '$lib/db';
import { eq } from 'drizzle-orm';

export const getUser = async (userId: string) => {
  const user = await appDb.select().from(usersTable).where(eq(usersTable.id, userId)).get();
  return user;
};

export const isEmailInUserTable = async (email: string) => {
  const isExistingUser = (await appDb.select().from(usersTable).where(eq(usersTable.email, email)).get()) !== undefined;
  return isExistingUser;
};
