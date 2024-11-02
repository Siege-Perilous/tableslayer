import { inviteResponseSchema } from '$lib/schemas';
import { acceptPartyInvite, declinePartyInvite, getPartyInvitesForEmail } from '$lib/server';
import type { Actions } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { user, parties } = await parent();
  if (!user) {
    throw new Error('User not found');
  }
  const email = user.email;
  const inviteResponseForm = await superValidate(zod(inviteResponseSchema));

  const invites = await getPartyInvitesForEmail(email);

  return {
    invites,
    inviteResponseForm,
    parties
  };
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
      await acceptPartyInvite(code, userId);
      return message(inviteResponseForm, { type: 'success', text: 'Invite accepted' });
    } catch (error) {
      console.log('invite error', error);
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
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
      return message(inviteResponseForm, { type: 'success', text: 'Invite declined' });
    } catch (error) {
      console.log('invite error', error);
      return message(inviteResponseForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
  }
};
