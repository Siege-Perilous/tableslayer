import { db } from '$lib/db/app';
import { partyInviteTable, partyMemberTable } from '$lib/db/app/schema';
import {
  changeRoleSchema,
  deleteGameSessionSchema,
  deleteInviteSchema,
  inviteMemberSchema,
  removePartyMemberSchema,
  renameGameSessionSchema,
  resendInviteSchema
} from '$lib/schemas';
import {
  changePartyRole,
  deletePartyGameSession,
  getEmailsInvitedToParty,
  getParty,
  getPartyMembers,
  getUser,
  isEmailAlreadyInvitedToParty,
  isUserByEmailInPartyAlready,
  isUserOnlyAdminInParty,
  renameGameSession,
  sendPartyInviteEmail
} from '$lib/server';
import { createSha256Hash } from '$lib/utils/hash';
import { isRedirect, redirect } from '@sveltejs/kit';
import { setToastCookie } from '@tableslayer/ui';
import { and, eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { v4 as uuidv4 } from 'uuid';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { party, user, members } = await parent();

  if (!party || !user) {
    throw new Error('Party is undefined');
  }
  const inviteMemberSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: inviteMemberSchema.shape.partyId.default(party.id)
  });

  const resendInviteSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: resendInviteSchema.shape.partyId.default(party.id)
  });

  const changeRoleSchemeWithPartyId = changeRoleSchema.extend({
    partyId: changeRoleSchema.shape.partyId.default(party.id)
  });

  const removeInviteSchemaWithPartyId = deleteInviteSchema.extend({
    partyId: deleteInviteSchema.shape.partyId.default(party.id)
  });

  const removeMemberSchemaWithPartyId = removePartyMemberSchema.extend({
    partyId: removePartyMemberSchema.shape.partyId.default(party.id)
  });

  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];

  const inviteMemberForm = await superValidate(zod(inviteMemberSchemaWithPartyId));
  const resendInviteForm = await superValidate(zod(resendInviteSchemaWithPartyId));
  const changeMemberRoleForm = await superValidate(zod(changeRoleSchemeWithPartyId));
  const removeInviteForm = await superValidate(zod(removeInviteSchemaWithPartyId));
  const removePartyMemberForm = await superValidate(zod(removeMemberSchemaWithPartyId));
  const deleteGameSessionForm = await superValidate(zod(deleteGameSessionSchema));
  const renameGameSessionForm = await superValidate(zod(renameGameSessionSchema));

  return {
    members,
    invitedEmails,
    changeMemberRoleForm,
    inviteMemberForm,
    resendInviteForm,
    removeInviteForm,
    removePartyMemberForm,
    deleteGameSessionForm,
    renameGameSessionForm
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
  inviteMember: async (event) => {
    const inviteMemberForm = await superValidate(event.request, zod(inviteMemberSchema));
    if (!inviteMemberForm.valid) {
      return message(inviteMemberForm, { type: 'error', text: 'Invalid email address' }, { status: 400 });
    }

    const { email, partyId } = inviteMemberForm.data;
    const party = await getParty(partyId);

    if (!party || !event.locals.user) {
      throw new Error('Party or user not found');
    }
    const userId = event.locals.user.id;
    const inviteCode = uuidv4();
    const hashedInviteCode = await createSha256Hash(inviteCode);

    const alreadyInParty = await isUserByEmailInPartyAlready(email, partyId);
    if (alreadyInParty) {
      return message(
        inviteMemberForm,
        { type: 'error', text: 'A user of that email is already in the party' },
        { status: 400 }
      );
    }

    const alreadyInvited = await isEmailAlreadyInvitedToParty(email, partyId);
    if (alreadyInvited) {
      return message(
        inviteMemberForm,
        { type: 'error', text: 'That email has already been invited to the party' },
        { status: 400 }
      );
    }

    try {
      await db.insert(partyInviteTable).values({
        partyId,
        email,
        role: 'viewer',
        invitedBy: userId,
        code: hashedInviteCode
      });

      await sendPartyInviteEmail(partyId, email, inviteCode);

      return message(inviteMemberForm, { type: 'success', text: `An invite has been sent to ${email}` });
    } catch (error) {
      console.log('Error inviting member', error);
      return message(inviteMemberForm, { type: 'error', text: 'Error inviting member' }, { status: 500 });
    }
  },
  resendInvite: async (event) => {
    console.log('resendInvite');
    const resendInviteForm = await superValidate(event.request, zod(resendInviteSchema));
    if (!resendInviteForm.valid) {
      console.log('Invalid email address');
      return message(resendInviteForm, { type: 'error', text: 'Invalid email address' }, { status: 400 });
    }

    const { email, partyId } = resendInviteForm.data;

    try {
      console.log('Resending invite');

      const inviteCode = uuidv4();
      const hashedInviteCode = await createSha256Hash(inviteCode);

      await db
        .update(partyInviteTable)
        .set({ code: hashedInviteCode })
        .where(eq(partyInviteTable.email, email))
        .execute();

      await sendPartyInviteEmail(partyId, email, inviteCode);
      return message(resendInviteForm, { type: 'success', text: `An invite has been sent to ${email}` });
    } catch (error) {
      console.log('Error resending invite', error);
      return message(resendInviteForm, { type: 'error', text: 'Error resending invite' }, { status: 500 });
    }
  },
  removeInvite: async (event) => {
    const removeInviteForm = await superValidate(event.request, zod(resendInviteSchema));
    if (!removeInviteForm.valid) {
      return message(removeInviteForm, { type: 'error', text: 'Invalid email address' }, { status: 400 });
    }

    const { email, partyId } = removeInviteForm.data;

    try {
      await db
        .delete(partyInviteTable)
        .where(and(eq(partyInviteTable.email, email), eq(partyInviteTable.partyId, partyId)))
        .execute();

      return message(removeInviteForm, { type: 'success', text: `${email} is no longer invited` });
    } catch (error) {
      console.log('Error removing invite', error);
      return message(removeInviteForm, { type: 'error', text: 'Error removing invite' }, { status: 500 });
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
  },
  deleteGameSession: async (event) => {
    const deleteGameSessionForm = await superValidate(event.request, zod(deleteGameSessionSchema));
    if (!deleteGameSessionForm.valid) {
      return message(deleteGameSessionForm, { type: 'error', text: 'Invalid game session' });
    }

    const { sessionId } = deleteGameSessionForm.data;

    try {
      await deletePartyGameSession(sessionId);

      setToastCookie(event, {
        title: 'Game session deleted',
        type: 'success'
      });
      return message(deleteGameSessionForm, { type: 'success', text: 'Game session deleted' });
    } catch (error) {
      if (error instanceof Error) {
        return message(deleteGameSessionForm, { type: 'error', text: error.message });
      } else {
        console.log('Error deleting game session', error);
        return message(deleteGameSessionForm, { type: 'error', text: 'Error deleting game session' });
      }
    }
  },
  renameGameSession: async (event) => {
    const renameGameSessionForm = await superValidate(event.request, zod(renameGameSessionSchema));
    if (!renameGameSessionForm.valid) {
      return message(renameGameSessionForm, { type: 'error', text: 'Invalid game session name' });
    }

    const { sessionId, name, partyId } = renameGameSessionForm.data;

    try {
      await renameGameSession(partyId, sessionId, name);
      return message(renameGameSessionForm, { type: 'success', text: 'Game session renamed' });
    } catch (error) {
      if (error instanceof Error) {
        return message(renameGameSessionForm, { type: 'error', text: error.message });
      } else {
        console.log('Error renaming game session', error);
        return message(renameGameSessionForm, { type: 'error', text: 'Error renaming game session' });
      }
    }
  }
};
