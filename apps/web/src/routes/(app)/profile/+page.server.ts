import { inviteResponseSchema } from '$lib/schemas';
import { acceptPartyInvite, declinePartyInvite, getPartiesForUser, getPartyInvitesForEmail } from '$lib/server';
import type { Actions } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  const email = user.email;
  const invites = await getPartyInvitesForEmail(email);

  const inviteResponseForm = await superValidate(zod(inviteResponseSchema));
  const parties = await getPartiesForUser(user.id);

  return {
    invites,
    inviteResponseForm,
    parties
  };
};

export const actions: Actions = {
  async acceptInvite(event) {
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
      await acceptPartyInvite(code, userId);
      return message(inviteResponseForm, { type: 'success', text: 'Invite accepted' });
    } catch (error) {
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
  },
  async declineInvite(event) {
    const inviteResponseForm = await superValidate(event.request, zod(inviteResponseSchema));
    if (!inviteResponseForm.valid) {
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
    try {
      const { code } = inviteResponseForm.data;
      await declinePartyInvite(code);
    } catch (error) {
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
  }
};
