import { db } from '$lib/db/app';
import { resetPasswordCodesTable, usersTable } from '$lib/db/app/schema';
import { resetPasswordSchema } from '$lib/schemas';
import { createSession, generateSessionToken, getUserByResetPasswordCode, setSessionTokenCookie } from '$lib/server';
import { isWithinExpirationDate } from '$lib/utils';
import { createArgonHash, createSha256Hash } from '$lib/utils/hash';
import type { Actions } from '@sveltejs/kit';
import { isRedirect, redirect } from '@sveltejs/kit';
import { setToastCookie } from '@tableslayer/ui';
import { eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const resetCode = event.params.code;
  console.log('event in params', event);
  console.log('resetCode in params', resetCode);
  const hashedResetCode = await createSha256Hash(resetCode);
  const resetPasswordForm = await superValidate(zod(resetPasswordSchema));

  try {
    const resetPasswordCodeRow = await db
      .select()
      .from(resetPasswordCodesTable)
      .where(eq(resetPasswordCodesTable.code, hashedResetCode))
      .get();
    console.log('resetPasswordCodeRow', resetPasswordCodeRow);
    const isWithinExpiration =
      resetPasswordCodeRow !== undefined && isWithinExpirationDate(resetPasswordCodeRow.expiresAt);
    const { user } = await event.parent();
    const userDesiringReset = await getUserByResetPasswordCode(hashedResetCode);
    if (!isWithinExpiration) {
      setToastCookie(event, {
        title: 'Reset code expired',
        type: 'danger'
      });
      return redirect(302, '/reset-password/invalid?error=expired-code');
    }

    if (!userDesiringReset) {
      setToastCookie(event, {
        title: 'Reset code not found',
        type: 'danger'
      });
      return redirect(302, '/reset-password/invalid?error=invalid-code');
    }

    if (user && user !== userDesiringReset) {
      setToastCookie(event, {
        title: 'Logged in user does not match reset code user',
        type: 'danger'
      });
      return redirect(302, '/reset-password/invalid?error=wrong-user');
    }

    return {
      userDesiringReset,
      resetPasswordForm
    };
  } catch (error) {
    // SvelteKit considers redirects within try/catch as errors
    // Checking for them here allows the redirect to be handled
    if (isRedirect(error)) {
      throw error;
    } else {
      console.error('Error fetching reset password details', error);
      // If the catch failed, it's because the code doesn't exist
      redirect(302, '/reset-password/invalid?error=invalid-code');
    }
  }
};

export const actions: Actions = {
  default: async (event) => {
    const resetPasswordForm = await superValidate(event.request, zod(resetPasswordSchema));

    if (!resetPasswordForm.valid) {
      return message(resetPasswordForm, { type: 'error', text: 'Invalid password combindation' }, { status: 401 });
    }

    try {
      const { userId, password } = resetPasswordForm.data;
      const passwordHash = await createArgonHash(password);
      await db.delete(resetPasswordCodesTable).where(eq(resetPasswordCodesTable.userId, userId)).execute();
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId)).execute();

      setToastCookie(event, {
        title: `Password updated`,
        type: 'success'
      });

      const token = generateSessionToken();
      await createSession(token, userId.toString());
      setSessionTokenCookie(event, token);

      return redirect(302, `/profile`);
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      } else {
        console.log('invite error', error);
        return message(
          resetPasswordForm,
          { type: 'error', text: 'Database error, please contact support' },
          { status: 401 }
        );
      }
    }
  }
};
