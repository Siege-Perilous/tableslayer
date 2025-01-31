import { db } from '$lib/db/app';
import { resetPasswordCodesTable, usersTable, type SelectUser } from '$lib/db/app/schema';
import { getFile, transformImage } from '$lib/server';
import { eq } from 'drizzle-orm';

export const getUser = async (userId: string) => {
  try {
    const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).get()) as SelectUser;
    const file = await getFile(user.avatarFileId);
    const thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    const userWithThumb = { ...user, thumb: thumb };
    return userWithThumb;
  } catch (error) {
    console.error('Error getting user from table', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    console.log('Getting user by email:', email);
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();

    if (!user) {
      console.warn('No user found for email:', email);
      return null; // Return null instead of throwing
    }

    console.log('User found:', user);

    // Fetch avatar file and thumbnail if the user exists
    let thumb = null;
    try {
      const file = await getFile(user.avatarFileId);
      thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    } catch (fileError) {
      console.warn('Error fetching or transforming avatar for user:', email, fileError);
    }

    return { ...user, thumb }; // Return user with thumb (or null thumb if failed)
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error; // Allow unexpected errors to propagate
  }
};

export const isEmailInUserTable = async (email: string) => {
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
