import { db } from '$lib/db';
import { emailVerificationCodesTable, usersTable } from '$lib/db/schema';
import { getUser } from '$lib/server';
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
  verify: async (event) => {
    if (!event.locals.user) {
      return fail(401, {
        message: 'Unauthorized'
      });
    }
    const userId = event.locals.user.id;
    const formData = await event.request.formData();
    const userInputCode = formData.get('code');
    const verifcationCode = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.userId, userId))
      .get();

    if (!verifcationCode) {
      return fail(400, {
        message: 'No code found'
      });
    } else if (!isWithinExpirationDate(verifcationCode.expiresAt)) {
      return fail(400, {
        message: 'Code expired'
      });
    } else if (userInputCode !== verifcationCode.code) {
      return fail(400, {
        message: 'Invalid code'
      });
    } else if (userInputCode === verifcationCode.code) {
      try {
        await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId)).execute();
        await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));
        return {
          status: 200,
          message: 'Email verified'
        };
      } catch (error) {
        console.error(error);
        return fail(500, {
          message: 'Failed to verify email'
        });
      }
    }
  }
};
