import { db } from '$lib/db/app';
import {
  emailVerificationCodesTable,
  partyMemberTable,
  resetPasswordCodesTable,
  usersTable,
  type SelectUser
} from '$lib/db/app/schema';
import {
  createGameSession,
  createRandomNamedParty,
  EmailAlreadyInUseError,
  getFile,
  getGravatarDisplayName,
  getGravatarUrl,
  getPartiesForUser,
  getParty,
  sendSingleEmail,
  sendVerificationEmail,
  transformImage,
  uploadFileFromUrl
} from '$lib/server';
import { isWithinExpirationDate } from '$lib/utils';
import { createArgonHash, createSha256Hash, createShortCode } from '$lib/utils/hash';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
const baseURL = process.env.BASE_URL || 'http://localhost:5174';

export const getUser = async (userId: string) => {
  try {
    const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).get()) as SelectUser;
    const file = await getFile(user.avatarFileId);
    const thumb = await transformImage(file.location, 'w=164,h=164,fit=cover,gravity=center');
    const userWithThumb = {
      ...user,
      thumb: thumb,
      hasPassword: !!user.passwordHash,
      hasGoogle: !!user.googleId
    };
    return userWithThumb;
  } catch (error) {
    console.error('Error getting user from table', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();

    if (!user) {
      console.warn('No user found for email:', email);
      return null; // Return null instead of throwing
    }

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

export const createUserByEmailAndPassword = async (email: string, password: string, userId: string) => {
  const passwordHash = await createArgonHash(password);
  const randomShortCode = createShortCode();
  const emailVerificationHash = await createSha256Hash(randomShortCode);

  try {
    if (await isEmailInUserTable(email)) {
      throw new Error('Email already in use');
    }
    const name = await getGravatarDisplayName(email);
    await db.insert(usersTable).values({
      id: userId,
      name,
      email: email,
      passwordHash: passwordHash
    });
    try {
      const gravatar = getGravatarUrl(email);
      const fileToUserRow = await uploadFileFromUrl(gravatar, userId, 'avatar');
      if (fileToUserRow) {
        await db.update(usersTable).set({ avatarFileId: fileToUserRow.fileId }).where(eq(usersTable.id, userId));
      }
    } catch (avatarError) {
      console.error('Error uploading avatar', avatarError);
      throw avatarError;
    }

    // Create a personal party for the user
    const party = await createRandomNamedParty();

    await db.insert(partyMemberTable).values({
      partyId: party.id,
      userId: userId,
      role: 'admin'
    });

    // Create a game session database
    await createGameSession(party.id);

    // Create an email verification code
    await db
      .insert(emailVerificationCodesTable)
      .values({
        userId,
        code: emailVerificationHash
      })
      .returning()
      .get();

    // Send email
    await sendSingleEmail({
      to: email,
      subject: 'Verify your email at Table Slayer',
      html: `Your verification code is: ${randomShortCode}`
    });
  } catch (e) {
    console.error('Error creating user', e);
    throw e;
  }
};

export const initiateResetPassword = async (email: string) => {
  const randomString = uuidv4();
  const resetPasswordHash = await createSha256Hash(randomString);
  try {
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();
    const existingResetCode = await db
      .select()
      .from(resetPasswordCodesTable)
      .where(eq(resetPasswordCodesTable.email, email))
      .get();

    if (existingResetCode) {
      await db.delete(resetPasswordCodesTable).where(eq(resetPasswordCodesTable.email, email)).run();
    }
    if (!existingUser) {
      throw new Error('Check your email for a password reset link');
    }

    await db.insert(resetPasswordCodesTable).values({
      email,
      code: resetPasswordHash,
      userId: existingUser.id
    });

    await sendSingleEmail({
      to: email,
      subject: 'Reset your password on Table Slayer',
      html: `Visit ${baseURL}/reset-password/${randomString} to reset your password. If you did not make this request, ignore this email. No futher steps are required.`
    });
  } catch (error) {
    console.error(error);
  }
};

export const resetPassword = async (code: string, password: string, loggedInUserId?: string) => {
  try {
    const hashedResetCode = await createSha256Hash(code);
    const resetPasswordCodeRow = await db
      .select()
      .from(resetPasswordCodesTable)
      .where(eq(resetPasswordCodesTable.code, hashedResetCode))
      .get();

    const isWithinExpiration =
      resetPasswordCodeRow !== undefined && isWithinExpirationDate(resetPasswordCodeRow.expiresAt);

    if (!isWithinExpiration) {
      throw new Error('Reset code expired');
    }

    const userDesiringReset = await getUserByResetPasswordCode(hashedResetCode);

    if (!userDesiringReset) {
      throw new Error('Reset code not found');
    }

    if (loggedInUserId && loggedInUserId !== userDesiringReset.id) {
      throw new Error('Reset code does not match user');
    }

    const passwordHash = await createArgonHash(password);
    await db.delete(resetPasswordCodesTable).where(eq(resetPasswordCodesTable.userId, userDesiringReset.id)).execute();
    const user = await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, userDesiringReset.id))
      .returning()
      .get();
    return user;
  } catch (error) {
    console.error('Error resetting password', error);
    throw error;
  }
};

export const changeUserEmail = async (userId: string, newEmail: string) => {
  try {
    const existingUser = await getUserByEmail(newEmail);
    if (existingUser) {
      throw new Error('Email already in use');
    }
    await db
      .update(usersTable)
      .set({ email: newEmail, emailVerified: false })
      .where(eq(usersTable.id, userId))
      .execute();
    await sendVerificationEmail(userId, newEmail);
  } catch (error) {
    console.error('Error changing user email', error);
    throw error;
  }
};

export const resendVerifyEmail = async (userId: string) => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    await sendVerificationEmail(userId, user.email);
  } catch (error) {
    console.error('Error resending verification email', error);
    throw error;
  }
};

export const verifyEmail = async (userId: string, code: string) => {
  try {
    const hashedCode = await createSha256Hash(code);

    const verificationCode = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.userId, userId))
      .get();
    if (
      !verificationCode ||
      !isWithinExpirationDate(verificationCode.expiresAt) ||
      verificationCode.code !== hashedCode
    ) {
      throw new Error('Invalid verification code');
    }

    await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId)).execute();
    await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));
  } catch (error) {
    console.error('Error verifying email', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: Partial<SelectUser>, newPassword?: string) => {
  try {
    if (newPassword) {
      const passwordHash = await createArgonHash(newPassword);
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId)).execute();
    }
    let emailWasChanged = false;
    const currentUser = await getUser(userId);
    if (userData.email && userData.email !== currentUser.email) {
      // Check if user has Google linked
      if (currentUser.hasGoogle) {
        throw new Error('Cannot change email while Google account is linked. Please unlink Google first.');
      }
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new EmailAlreadyInUseError('Email already in use');
      }
      await changeUserEmail(userId, userData.email);
      emailWasChanged = true;
    }

    // Handle Google unlinking
    if (userData.googleId === null) {
      // Check if user has a password before allowing Google unlink
      const userAuth = await db
        .select({ passwordHash: usersTable.passwordHash })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .get();
      if (!userAuth?.passwordHash) {
        throw new Error('Cannot unlink Google account without a password set');
      }
    }

    const user = await db.update(usersTable).set(userData).where(eq(usersTable.id, userId)).returning().get();
    return { user, emailWasChanged: emailWasChanged };
  } catch (error) {
    console.error('Error updating user', error);
    throw error;
  }
};

// Used to decide which party to send the user to when they first log in
export const getRecentParty = async (userId: string) => {
  try {
    const user = await getUser(userId);
    if (user.favoriteParty) {
      const party = await getParty(user.favoriteParty);
      return party;
    }
    const parties = await getPartiesForUser(userId);
    if (!parties) {
      return null;
    }
    return parties[0];
  } catch {
    return null;
  }
};

export const getUserByGoogleId = async (googleId: string) => {
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.googleId, googleId)).get();

    if (!user) {
      return null;
    }

    let thumb = null;
    try {
      const file = await getFile(user.avatarFileId);
      thumb = await transformImage(file.location, 'w=80,h=80,fit=cover,gravity=center');
    } catch (fileError) {
      console.warn('Error fetching or transforming avatar for user:', user.email, fileError);
    }

    return { ...user, thumb };
  } catch (error) {
    console.error('Error getting user by Google ID:', error);
    throw error;
  }
};

export const createOrUpdateGoogleUser = async (googleId: string, email: string, name: string, avatarUrl?: string) => {
  try {
    // First check if user exists with this Google ID
    const existingGoogleUser = await getUserByGoogleId(googleId);
    if (existingGoogleUser) {
      // User already linked with Google, return them
      return existingGoogleUser;
    }

    // Check if user exists with this email
    const existingEmailUser = await getUserByEmail(email);
    if (existingEmailUser) {
      // Link Google account to existing user
      await db
        .update(usersTable)
        .set({
          googleId,
          emailVerified: true, // Google users are automatically verified
          name // Update name from Google profile
        })
        .where(eq(usersTable.id, existingEmailUser.id))
        .execute();

      return await getUser(existingEmailUser.id);
    }

    // Create new user with Google credentials
    const userId = uuidv4();
    await db.insert(usersTable).values({
      id: userId,
      name,
      email,
      googleId,
      emailVerified: true, // Google users are automatically verified
      passwordHash: null // No password for Google-only users
    });

    // Try to upload avatar from Google
    try {
      if (avatarUrl) {
        const fileToUserRow = await uploadFileFromUrl(avatarUrl, userId, 'avatar');
        if (fileToUserRow) {
          await db.update(usersTable).set({ avatarFileId: fileToUserRow.fileId }).where(eq(usersTable.id, userId));
        }
      } else {
        // Fall back to Gravatar if no Google avatar
        const gravatar = getGravatarUrl(email);
        const fileToUserRow = await uploadFileFromUrl(gravatar, userId, 'avatar');
        if (fileToUserRow) {
          await db.update(usersTable).set({ avatarFileId: fileToUserRow.fileId }).where(eq(usersTable.id, userId));
        }
      }
    } catch (avatarError) {
      console.error('Error uploading avatar', avatarError);
    }

    // Create a personal party for the user
    const party = await createRandomNamedParty();

    await db.insert(partyMemberTable).values({
      partyId: party.id,
      userId: userId,
      role: 'admin'
    });

    // Create a game session database
    await createGameSession(party.id);

    return await getUser(userId);
  } catch (error) {
    console.error('Error creating or updating Google user:', error);
    throw error;
  }
};
