import { changeRoleSchema } from '$lib/schemas';
import { changePartyRole, getEmailsInvitedToParty, getPartyMembers } from '$lib/server';
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
      const members = await getPartyMembers(partyId);

      const currentAdmins = members.filter((member) => member.role === 'admin');
      const isTargetAdmin = currentAdmins.some((admin) => admin.id === userId);

      if (isTargetAdmin && role !== 'admin' && currentAdmins.length === 1) {
        return message(changeRoleForm, { type: 'error', text: 'Cannot remove the last admin' }, { status: 400 });
      }

      changePartyRole(userId, partyId, role);

      return message(changeRoleForm, { type: 'success', text: `Role changed to ${role}` });
    } catch (error) {
      console.log('Error changing role', error);
      return message(changeRoleForm, { type: 'error', text: 'Error changing role' }, { status: 500 });
    }
  }
};
