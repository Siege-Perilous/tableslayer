import { db } from '$lib/db/app';
import { partyMemberTable } from '$lib/db/app/schema';
import { changeRoleSchema, inviteMemberSchema, removePartyMemberSchema, resendInviteSchema } from '$lib/schemas';
import {
  changePartyRole,
  getEmailsInvitedToParty,
  getPartyMembers,
  getUser,
  isUserOnlyAdminInParty
} from '$lib/server';
import { isRedirect, redirect } from '@sveltejs/kit';
import { setToastCookie } from '@tableslayer/ui';
import { and, eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { party, user, members } = await parent();

  if (!party || !user) {
    throw new Error('Party is undefined');
  }

  const resendInviteSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: resendInviteSchema.shape.partyId.default(party.id)
  });

  const changeRoleSchemeWithPartyId = changeRoleSchema.extend({
    partyId: changeRoleSchema.shape.partyId.default(party.id)
  });

  const removeMemberSchemaWithPartyId = removePartyMemberSchema.extend({
    partyId: removePartyMemberSchema.shape.partyId.default(party.id)
  });

  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];

  const resendInviteForm = await superValidate(zod(resendInviteSchemaWithPartyId));
  const changeMemberRoleForm = await superValidate(zod(changeRoleSchemeWithPartyId));
  const removePartyMemberForm = await superValidate(zod(removeMemberSchemaWithPartyId));

  return {
    members,
    invitedEmails,
    changeMemberRoleForm,
    resendInviteForm,
    removePartyMemberForm
  };
};

export const actions: Actions = {
  changeRole: async (event) => {
    const changeRoleForm = await superValidate(event.request, zod(changeRoleSchema));
    if (!changeRoleForm.valid) {
      return message(changeRoleForm, { type: 'error', text: 'Invalid role' }, { status: 400 });
    }

    const { userId, partyId, role } = changeRoleForm.data;

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
  },
  removePartyMember: async (event) => {
    const removePartyMemberForm = await superValidate(event.request, zod(removePartyMemberSchema));
    if (!removePartyMemberForm.valid) {
      return message(
        removePartyMemberForm,
        { type: 'error', text: 'Unable to remove this party member' },
        { status: 400 }
      );
    }
    const { userId, partyId } = removePartyMemberForm.data;

    try {
      const user = await getUser(userId);
      const isOnlyAdmin = await isUserOnlyAdminInParty(userId, partyId);
      if (isOnlyAdmin) {
        console.log('User is the only admin');
        return message(removePartyMemberForm, { type: 'error', text: 'Cannot remove the last admin' });
      }
      await db
        .delete(partyMemberTable)
        .where(and(eq(partyMemberTable.userId, userId), eq(partyMemberTable.partyId, partyId)))
        .execute();

      if (event.locals.user.id === userId) {
        setToastCookie(event, {
          title: `${user.name || user.email} removed from the party`,
          type: 'success'
        });
        return redirect(303, `/profile`);
      }
      return message(removePartyMemberForm, {
        type: 'success',
        text: `${user.name || user.email} removed from the party`
      });
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      } else {
        console.log('Error removing member', error);
        return message(
          removePartyMemberForm,
          { type: 'error', text: 'Unable to remove party member' },
          { status: 500 }
        );
      }
    }
  }
};
