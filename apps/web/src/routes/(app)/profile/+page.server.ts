import { acceptInviteSchema } from '$lib/schemas';
import { acceptPartyInvite, declinePartyInvite, getPartyInvitesForEmail } from '$lib/server';
import type { Actions } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  const email = user.email;
  const invites = await getPartyInvitesForEmail(email);

  const acceptInviteForm = await superValidate(zod(acceptInviteSchema));

  return {
    invites,
    acceptInviteForm
  };
};

export const actions: Actions = {
  async acceptInvite(event) {
    if (!event.locals.user) {
      throw new Error('User not found');
    }
    const userId = event.locals.user.id;

    const acceptInviteForm = await superValidate(event.request, zod(acceptInviteSchema));
    if (!acceptInviteForm.valid) {
      return message(acceptInviteForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }

    try {
      const { code } = acceptInviteForm.data;
      await acceptPartyInvite(code, userId);
      return message(acceptInviteForm, { type: 'success', text: 'Invite accepted' });
    } catch (error) {
      return message(acceptInviteForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
  },
  async declineInvite(event) {
    const acceptInviteForm = await superValidate(event.request, zod(acceptInviteSchema));
    if (!acceptInviteForm.valid) {
      return message(acceptInviteForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
    try {
      const { code } = acceptInviteForm.data;
      await declinePartyInvite(code);
    } catch (error) {
      return message(acceptInviteForm, { type: 'error', text: 'Invalid code' }, { status: 401 });
    }
  }
};
