import { inviteResponseSchema } from '$lib/schemas';
import {
  acceptPartyInvite,
  checkIfEmailInUserTable,
  createSession,
  declinePartyInvite,
  generateSessionToken,
  getParty,
  getPartyInvitesForCode,
  getUserByEmail,
  setSessionTokenCookie
} from '$lib/server';
import type { Actions } from '@sveltejs/kit';
import { isRedirect, redirect } from '@sveltejs/kit';
import { setToastCookie } from '@tableslayer/ui';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const inviteCode = event.params.code;
  const inviteResponseForm = await superValidate(zod(inviteResponseSchema));

  try {
    const invite = await getPartyInvitesForCode(inviteCode);
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
      const userExistsAlready = await checkIfEmailInUserTable(invite.invite.email);

      if (userExistsAlready) {
        // Since code comes by email, we can just log them in
        const token = generateSessionToken();
        const invitedUser = await getUserByEmail(invite.invite.email);
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
      inviteResponseForm,
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

export const actions: Actions = {
  async acceptInvite(event) {
    await new Promise((r) => setTimeout(r, 1000));
    if (!event.locals.user) {
      throw new Error('User not found');
    }
    const userId = event.locals.user.id;

    const inviteResponseForm = await superValidate(event.request, zod(inviteResponseSchema));
    if (!inviteResponseForm.valid) {
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }

    try {
      const { code } = inviteResponseForm.data;
      const invite = await getPartyInvitesForCode(code);
      const party = await getParty(invite.invite.partyId);
      await acceptPartyInvite(code, userId);

      setToastCookie(event, {
        title: `Accepted invite to ${party.name}`,
        type: 'success'
      });
      return redirect(302, `/${party.slug}`);
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      } else {
        console.log('invite error', error);
        return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
      }
    }
  },
  async declineInvite(event) {
    await new Promise((r) => setTimeout(r, 1000));
    const inviteResponseForm = await superValidate(event.request, zod(inviteResponseSchema));
    if (!inviteResponseForm.valid) {
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
    try {
      const { code } = inviteResponseForm.data;
      await declinePartyInvite(code);

      setToastCookie(event, {
        title: `Invite declined`,
        type: 'success'
      });
      return redirect(302, '/profile');
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      } else {
        console.log('invite error', error);
        return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
      }
    }
  }
};
