import {
  createSession,
  generateSessionToken,
  getPartyInvitesForCode,
  getUserByEmail,
  isEmailInUserTable,
  setSessionTokenCookie
} from '$lib/server';
import { createSha256Hash } from '$lib/utils/hash';
import { isRedirect, redirect } from '@sveltejs/kit';
import { setToastCookie } from '@tableslayer/ui';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const inviteCode = event.params.code;
  const hashedInviteCode = await createSha256Hash(inviteCode);

  try {
    const invite = await getPartyInvitesForCode(hashedInviteCode);
    const { user } = await event.parent();

    if (!invite) {
      setToastCookie(event, {
        title: 'Invite not found',
        type: 'danger'
      });
      return redirect(302, '/invalid-invite?error=invalid-code');
    }

    // User is not logged in
    if (!user) {
      console.log('User not logged in');
      const userExistsAlready = await isEmailInUserTable(invite.invite.email);

      if (userExistsAlready) {
        // Since code comes by email, we can just log them in
        const token = generateSessionToken();
        const invitedUser = await getUserByEmail(invite.invite.email);
        if (!invitedUser) {
          throw new Error('Invited user of that email does not exist');
        }
        await createSession(token, invitedUser.id);
        setSessionTokenCookie(event, token);

        // Redirect to the same page, now logged in
        return redirect(302, '/accept-invite/' + inviteCode);
      } else {
        return {
          invite
        };
      }
    }

    if (user.email !== invite.invite.email) {
      setToastCookie(event, {
        title: `Logged in email does not match invite email`,
        type: 'danger'
      });
      console.log('User email does not match invite email');
      return redirect(302, '/invalid-invite?error=wrong-email');
    }

    return {
      invite
    };
  } catch (error) {
    // SvelteKit considers redirects within try/catch as errors
    // Checking for them here allows the redirect to be handled
    if (isRedirect(error)) {
      throw error;
    } else {
      console.error('Error fetching invite', error);
      // If the catch failed, it's because the code doesn't exist
      redirect(302, '/invalid-invite?error=invalid-code');
    }
  }
};
