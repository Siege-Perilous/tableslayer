import { db } from '$lib/db/app';
import { emailVerificationCodesTable, partyMemberTable, usersTable } from '$lib/db/app/schema';
import { signupSchema } from '$lib/schemas';
import {
  createSession,
  generateSessionToken,
  getGravatarUrl,
  getUser,
  sendSingleEmail,
  setSessionTokenCookie,
  uploadFileFromUrl
} from '$lib/server';
import { createRandomNamedParty } from '$lib/server/party/createParty';
import { createGameSessionDb } from '$lib/server/turso';
import { createHash } from '$lib/utils';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { v4 as uuidv4 } from 'uuid';
import type { Actions, PageServerLoad } from './$types';

// Define a custom type for database errors
interface DatabaseError extends Error {
  code?: string;
}

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (user && user.emailVerified) {
      throw redirect(302, '/');
    } else {
      throw redirect(302, '/verify-email');
    }
  }
  const signupForm = await superValidate(zod(signupSchema));
  return {
    signupForm
  };
};

export const actions: Actions = {
  default: async (event) => {
    const signupForm = await superValidate(event.request, zod(signupSchema));
    if (!signupForm.valid) {
      return message(signupForm, { type: 'error', text: 'Check the form for errors' }, { status: 400 });
    }

    const { email, password } = signupForm.data;

    const passwordHash = await createHash(password);
    const userId = uuidv4();

    try {
      await db.insert(usersTable).values({
        id: userId,
        name: '',
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
      await createGameSessionDb(party.id);

      // Create an email verification code
      const emailVerificationCode = await db
        .insert(emailVerificationCodesTable)
        .values({
          userId
        })
        .returning()
        .get();

      // Send email
      await sendSingleEmail({
        to: email,
        subject: 'Verify your email',
        html: `Your verification code is: ${emailVerificationCode.code}`
      });

      const token = generateSessionToken();
      await createSession(token, userId.toString());
      setSessionTokenCookie(event, token);

      return message(signupForm, {
        type: 'success',
        text: 'Account created! Check your email for a verification code'
      });
    } catch (error) {
      const e = error as DatabaseError;
      console.log(e);

      // Handle unique constraint error
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return message(signupForm, { type: 'error', text: 'Email already in use' }, { status: 400 });
      }
      return message(signupForm, { type: 'error', text: `An error occurred: ${error}` }, { status: 500 });
    }
  }
};
