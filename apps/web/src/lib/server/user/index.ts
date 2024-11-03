import { db } from '$lib/db/app';
import { usersTable, type SelectUser } from '$lib/db/app/schema';
import { getFile, transformImage } from '$lib/server';
import { eq } from 'drizzle-orm';

export const getUser = async (userId: string) => {
  try {
    const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).get()) as SelectUser;
    const file = await getFile(user.avatarFileId);
    const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    const userWithThumb = { ...user, avatarThumb: thumb };
    return userWithThumb;
  } catch (error) {
    console.error('Error getting user from table', error);
    throw error;
  }
};

export const isEmailInUserTable = async (email: string) => {
  const isExistingUser = (await db.select().from(usersTable).where(eq(usersTable.email, email)).get()) !== undefined;
  return isExistingUser;
};
