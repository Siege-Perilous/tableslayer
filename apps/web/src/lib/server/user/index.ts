import { db } from '$lib/db/app';
import { usersTable, type SelectUser } from '$lib/db/app/schema';
import { eq } from 'drizzle-orm';

export const getUser = async (userId: string) => {
  try {
    const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).get()) as SelectUser;
    return user;
  } catch (error) {
    console.error(error);
  }
};

export const isEmailInUserTable = async (email: string) => {
  const isExistingUser = (await db.select().from(usersTable).where(eq(usersTable.email, email)).get()) !== undefined;
  return isExistingUser;
};
