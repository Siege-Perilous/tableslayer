import { db } from '$lib/db/app';
import { emailVerificationCodesTable } from '$lib/db/app/schema';
import { getUser, isEmailEnabled } from '$lib/server';
import { isWithinExpirationDate } from '$lib/utils';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) {
    throw redirect(302, '/');
  }

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  const isVerified = user?.emailVerified ?? false;
  const emailEnabled = isEmailEnabled();

  if (isVerified) {
    throw redirect(302, '/profile');
  }

  const emailVerificationCode = await db
    .select()
    .from(emailVerificationCodesTable)
    .where(eq(emailVerificationCodesTable.userId, userId))
    .get();
  const isWithinExpiration =
    emailVerificationCode !== undefined && isWithinExpirationDate(emailVerificationCode.expiresAt);

  return {
    user,
    isWithinExpiration,
    isVerified,
    emailEnabled
  };
};
