import { db } from '$lib/db';
import { emailVerificationCodesTable, partyMemberTable, usersTable } from '$lib/db/schema';
import { signupSchema } from '$lib/schemas';
import { getGravatarUrl, getUser, sendSingleEmail, uploadImage } from '$lib/server';
import { lucia } from '$lib/server/auth';
import { createRandomNamedParty } from '$lib/server/party/createParty';
import { createHash } from '$lib/utils';
import { redirect } from '@sveltejs/kit';
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
      // Create a new user with a Gravatar image
      const gravatar = getGravatarUrl(email);
      const image = (await uploadImage(gravatar)) as string;
      await db.insert(usersTable).values({
        id: userId,
        name: '',
        email: email,
        passwordHash: passwordHash,
        avatar: image
      });

      // Create a personal party for the user
      const party = await createRandomNamedParty();

      await db.insert(partyMemberTable).values({
        partyId: party.id,
        userId: userId,
        role: 'admin'
      });

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

      // Create an auth session
      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });

      return message(signupForm, {
        type: 'success',
        text: 'Account created! Check your email for a verification code'
      });
    } catch (error) {
      const e = error as DatabaseError;

      // Handle unique constraint error
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return message(signupForm, { type: 'error', text: 'Email already in use' }, { status: 400 });
      }
      return message(signupForm, { type: 'error', text: 'An error occurred' }, { status: 500 });
    }
  }
};
