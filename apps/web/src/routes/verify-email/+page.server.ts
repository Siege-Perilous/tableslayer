import { db } from '$lib/db';
import { emailVerificationCodesTable, usersTable } from '$lib/db/schema';
import { changeUserEmailSchema, resendVerificationCodeSchema, verificationCodeSchema } from '$lib/schemas';
import { getUser, sendVerificationEmail } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { isWithinExpirationDate } from 'oslo';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) {
    throw redirect(302, '/');
  }

  const userId = event.locals.user.id;
  const user = await getUser(userId);
  const isVerified = user?.emailVerified ?? false;
  const emailVerificationCode = await db
    .select()
    .from(emailVerificationCodesTable)
    .where(eq(emailVerificationCodesTable.userId, userId))
    .get();
  const isWithinExpiration =
    emailVerificationCode !== undefined && isWithinExpirationDate(emailVerificationCode.expiresAt);

  const changeEmailForm = await superValidate(zod(changeUserEmailSchema));
  const resendForm = await superValidate(zod(resendVerificationCodeSchema));
  const verifyForm = await superValidate(zod(verificationCodeSchema));

  return {
    user,
    isWithinExpiration,
    isVerified,
    changeEmailForm,
    resendForm,
    verifyForm
  };
};

export const actions: Actions = {
  changeEmail: async (event) => {
    const changeEmailForm = await superValidate(event.request, zod(changeUserEmailSchema));
    if (!event.locals.user) {
      return message(changeEmailForm, 'Unauthorized');
    }
    if (!changeEmailForm.valid) return message(changeEmailForm, 'Invalid email address');

    const userId = event.locals.user.id;
    const { email } = changeEmailForm.data;

    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();
    if (existingUser) {
      return message(changeEmailForm, 'This email is already in use');
    }

    await db.update(usersTable).set({ email }).where(eq(usersTable.id, userId)).execute();
    await sendVerificationEmail(userId, email);

    return message(changeEmailForm, 'Email updated successfully');
  },

  resend: async (event) => {
    const resendForm = await superValidate(event.request, zod(resendVerificationCodeSchema));
    if (!event.locals.user) {
      return message(resendForm, 'Unauthorized');
    }
    if (!resendForm.valid) return message(resendForm, 'Failed to resend email');

    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (!user) return message(resendForm, 'Failed to resend email');

    await sendVerificationEmail(user.id, user.email);
    return message(resendForm, 'Verification email resent successfully');
  },

  verify: async (event) => {
    const verifyForm = await superValidate(event.request, zod(verificationCodeSchema));
    if (!event.locals.user) {
      return message(verifyForm, 'Unauthorized');
    }
    if (!verifyForm.valid) return message(verifyForm, 'Invalid verification code');

    const userId = event.locals.user.id;
    const { code } = verifyForm.data;
    const verificationCode = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.userId, userId))
      .get();

    if (!verificationCode || !isWithinExpirationDate(verificationCode.expiresAt) || verificationCode.code !== code) {
      return message(verifyForm, 'Invalid or expired verification code');
    }

    await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId)).execute();
    await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));

    return message(verifyForm, 'Email verified successfully');
  }
};
