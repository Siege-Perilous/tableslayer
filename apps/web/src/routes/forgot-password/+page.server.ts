import { db } from '$lib/db/app';
import { resetPasswordCodesTable, usersTable } from '$lib/db/app/schema';
import { forgotPasswordSchema } from '$lib/schemas';
import { sendSingleEmail } from '$lib/server';
import { createHash } from '$lib/utils/hash';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const baseURL = process.env.BASE_URL || 'http://localhost:5174';

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    throw redirect(302, '/');
  }
  const forgotPasswordForm = await superValidate(zod(forgotPasswordSchema));
  return {
    forgotPasswordForm
  };
};

export const actions: Actions = {
  default: async (event) => {
    const forgotPasswordForm = await superValidate(event.request, zod(forgotPasswordSchema));
    if (!forgotPasswordForm.valid) {
      return message(forgotPasswordForm, { type: 'error', text: 'Check the form for errors' }, { status: 400 });
    }

    const { email } = forgotPasswordForm.data;
    const randomString = generateRandomString(32, alphabet('0-9', 'A-Z'));
    const resetPasswordHash = await createHash(randomString);
    try {
      const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();
      if (!existingUser) {
        return message(forgotPasswordForm, { type: 'success', text: 'Check your email for a password reset link' });
      }
      await db.insert(resetPasswordCodesTable).values({
        email,
        code: resetPasswordHash,
        userId: existingUser.id
      });

      await sendSingleEmail({
        to: email,
        subject: 'Reset your password',
        html: `Visit ${baseURL}/reset-password/${randomString} to reset your password. If you did not make this request, ignore this email. No futher steps are required.`
      });

      return message(forgotPasswordForm, { type: 'success', text: 'Check your email for a password reset link' });
    } catch (error) {
      console.error(error);
      return message(forgotPasswordForm, { type: 'error', text: 'An error occurred' }, { status: 500 });
    }
  }
};
