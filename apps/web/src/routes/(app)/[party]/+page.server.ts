import { changeRoleSchema } from '$lib/schemas';
import { changePartyRole, getEmailsInvitedToParty } from '$lib/server';
import { setToastCookie } from '@tableslayer/ui';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { party, user, members } = await parent();

  if (!party || !user) {
    throw new Error('Party is undefined');
  }

  // Superform schemas
  const changeRoleSchemeWithPartyId = changeRoleSchema.extend({
    partyId: changeRoleSchema.shape.partyId.default(party.id)
  });

  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];
  const changeMemberRoleForm = await superValidate(zod(changeRoleSchemeWithPartyId));

  return {
    members,
    invitedEmails,
    changeMemberRoleForm
  };
};

export const actions: Actions = {
  changeRole: async (event) => {
    const changeRoleForm = await superValidate(event.request, zod(changeRoleSchema));
    if (!changeRoleForm.valid) {
      return message(changeRoleForm, { type: 'error', text: 'Invalid role' }, { status: 400 });
    }

    const { userId, partyId, role } = changeRoleForm.data;
    console.log('form data', changeRoleForm.data);

    try {
      changePartyRole(userId, partyId, role);

      setToastCookie(event, {
        title: `Role changed to ${role}`,
        type: 'success'
      });
      return message(changeRoleForm, { type: 'success', text: 'Role changed' });
    } catch (error) {
      console.log('Error changing role', error);
      return message(changeRoleForm, { type: 'error', text: 'Error changing role' }, { status: 500 });
    }
  }
};
