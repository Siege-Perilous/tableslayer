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
      return message(changeEmailForm, { type: 'error', text: 'Unauthorized' }, { status: 401 });
    }
    if (!changeEmailForm.valid)
      return message(changeEmailForm, { type: 'error', text: 'Invalid email address' }, { status: 400 });

    const userId = event.locals.user.id;
    const { email } = changeEmailForm.data;

    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();
    if (existingUser) {
      return message(changeEmailForm, { type: 'error', text: 'Email already in use' }, { status: 400 });
    }

    await db.update(usersTable).set({ email }).where(eq(usersTable.id, userId)).execute();
    await sendVerificationEmail(userId, email);

    return message(changeEmailForm, { type: 'success', text: 'Email changed successfully' });
  },

  resend: async (event) => {
    const resendForm = await superValidate(event.request, zod(resendVerificationCodeSchema));
    if (!event.locals.user) {
      return message(resendForm, { type: 'error', text: 'Unauthorized' }, { status: 401 });
    }
    if (!resendForm.valid)
      return message(resendForm, { type: 'error', text: 'Invalid email address' }, { status: 400 });

    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (!user) return message(resendForm, { type: 'error', text: 'User not found' }, { status: 404 });

    await sendVerificationEmail(user.id, user.email);
    return message(resendForm, { type: 'success', text: 'Verification email sent' });
  },

  verify: async (event) => {
    const verifyForm = await superValidate(event.request, zod(verificationCodeSchema));
    if (!event.locals.user) {
      return message(verifyForm, { type: 'error', text: 'Unauthorized' }, { status: 401 });
    }
    if (!verifyForm.valid)
      return message(verifyForm, { type: 'error', text: 'Invalid verification code' }, { status: 400 });

    const userId = event.locals.user.id;
    const { code } = verifyForm.data;
    const verificationCode = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.userId, userId))
      .get();

    if (!verificationCode || !isWithinExpirationDate(verificationCode.expiresAt) || verificationCode.code !== code) {
      return message(verifyForm, { type: 'error', text: 'Invalid verification code' }, { status: 400 });
    }

    await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId)).execute();
    await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));

    return message(verifyForm, { type: 'success', text: 'Email verified' });
  }
};
