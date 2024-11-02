import { db } from '$lib/db/app';
import { loginSchema } from '$lib/schemas';
import { lucia } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

// Import the users table schema
import { usersTable } from '$lib/db/app/schema';
import { verifyHash } from '$lib/utils';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    return redirect(302, '/');
  }
  const loginForm = await superValidate(zod(loginSchema));
  return { loginForm };
};

export const actions: Actions = {
  login: async (event) => {
    const cookies = event.cookies;
    const loginForm = await superValidate(event.request, zod(loginSchema));
    if (!loginForm.valid) {
      return message(loginForm, { type: 'error', text: 'Incorrect email or password' }, { status: 400 });
    }
    const { email, password } = loginForm.data;

    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();

    if (!existingUser) {
      return message(loginForm, { type: 'error', text: 'Incorrect email or password' }, { status: 400 });
    }

    const validPassword = await verifyHash(existingUser.passwordHash, password);

    if (!validPassword) {
      // NOTE:
      // Returning immediately allows malicious actors to figure out valid usernames from response times,
      // allowing them to only focus on guessing passwords in brute-force attacks.
      // As a preventive measure, you may want to hash passwords even for invalid usernames.
      // However, valid usernames can be already be revealed with the signup page among other methods.
      // It will also be much more resource intensive.
      // Since protecting against this is non-trivial,
      // it is crucial your implementation is protected against brute-force attacks with login throttling, 2FA, etc.
      // If usernames are public, you can outright tell the user that the username is invalid.
      return message(loginForm, { type: 'error', text: 'Incorrect email or password' }, { status: 400 });
    }

    const session = await lucia.createSession(existingUser.id.toString(), {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    return message(loginForm, { type: 'success', text: 'Login successful, redirecting...' }), redirect(302, '/');
  }
};
