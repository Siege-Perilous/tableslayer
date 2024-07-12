import { db } from '$lib/db';
import { emailVerificationCodesTable, usersTable } from '$lib/db/schema';
import { getUser, sendVerificationEmail } from '$lib/server';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { isWithinExpirationDate } from 'oslo';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  let isWithinExpiration = false;
  let isVerified = false;

  if (!event.locals.user) {
    return redirect(302, '/');
  }

  if (event.locals.user) {
    const userId = event.locals.user.id;
    const user = await getUser(userId);
    isVerified = user !== undefined && user.emailVerified;
    const emailVerificationCode = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.userId, userId))
      .get();
    isWithinExpiration = emailVerificationCode !== undefined && isWithinExpirationDate(emailVerificationCode.expiresAt);

    return {
      user,
      isWithinExpiration,
      isVerified
    };
  }
}) satisfies PageServerLoad;

export const actions: Actions = {
  changeEmail: async (event) => {
    if (!event.locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (!user) {
      throw fail(400, { message: 'The session cookie does not match any user' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email');

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, { message: 'Invalid email' });
    }

    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();

    if (existingUser) {
      return fail(400, { message: 'This email is already in use' });
    }

    await db.update(usersTable).set({ email }).where(eq(usersTable.id, user.id)).execute();
    await sendVerificationEmail(user.id, email);

    return { status: 200 };
  },
  resend: async (event) => {
    if (!event.locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (!user) {
      throw fail(400, { message: 'The session cookie does not match any user' });
    }
    await sendVerificationEmail(user.id, user.email);
    return { status: 200 };
  },
  verify: async (event) => {
    if (!event.locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (!user) {
      throw fail(400, { message: 'The session cookie does not match any user' });
    }
    const formData = await event.request.formData();
    const userInputCode = formData.get('code');
    const verificationCode = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.userId, userId))
      .get();

    if (!verificationCode) {
      return fail(400, { message: 'No code found' });
    }
    if (!isWithinExpirationDate(verificationCode.expiresAt)) {
      return fail(400, { message: 'Code expired' });
    }
    if (userInputCode !== verificationCode.code) {
      return fail(400, { message: 'Invalid code' });
    }

    try {
      await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId)).execute();
      await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));
      return { status: 200, message: 'Email verified' };
    } catch (error) {
      console.error(error);
      return fail(500, { message: 'Failed to verify email' });
    }
  }
};
