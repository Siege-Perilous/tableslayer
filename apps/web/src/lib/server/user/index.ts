import { db } from '$lib/db/app';
import { resetPasswordCodesTable, usersTable, type SelectUser } from '$lib/db/app/schema';
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

export const getUserByEmail = async (email: string) => {
  try {
    const user = (await db.select().from(usersTable).where(eq(usersTable.email, email)).get()) as SelectUser;
    const file = await getFile(user.avatarFileId);
    const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    const userWithThumb = { ...user, avatarThumb: thumb };
    if (!userWithThumb) {
      throw new Error('User not found');
    }
    return userWithThumb;
  } catch (error) {
    console.error('Error getting user from table', error);
    throw error;
  }
};

export const checkIfEmailInUserTable = async (email: string) => {
  try {
    const isExistingUser = (await db.select().from(usersTable).where(eq(usersTable.email, email)).get()) !== undefined;
    return isExistingUser;
  } catch (error) {
    console.error('Error checking if email is in user table', error);
    throw error;
  }
};

export const getUserByResetPasswordCode = async (code: string) => {
  console.log('code', code);
  try {
    const resetPasswordCodeRow = await db
      .select()
      .from(resetPasswordCodesTable)
      .where(eq(resetPasswordCodesTable.code, code))
      .get();
    if (!resetPasswordCodeRow) {
      throw new Error('Reset code not found');
    }
    const user = await getUser(resetPasswordCodeRow.userId);
    return user;
  } catch (error) {
    console.error('Error getting user by reset password code', error);
    throw error;
  }
};
