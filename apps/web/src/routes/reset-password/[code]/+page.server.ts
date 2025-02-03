import { db } from '$lib/db/app';
import { resetPasswordCodesTable } from '$lib/db/app/schema';
import { getUserByResetPasswordCode } from '$lib/server';
import { isWithinExpirationDate } from '$lib/utils';
import { createSha256Hash } from '$lib/utils/hash';
import { isRedirect, redirect } from '@sveltejs/kit';
import { setToastCookie } from '@tableslayer/ui';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const resetCode = event.params.code;
  const hashedResetCode = await createSha256Hash(resetCode);

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
      resetCode,
      userDesiringReset
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
