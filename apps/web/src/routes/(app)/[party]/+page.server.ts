import { db } from '$lib/db/app';
import { partyInviteTable } from '$lib/db/app/schema';
import { changeRoleSchema, deleteInviteSchema, inviteMemberSchema, resendInviteSchema } from '$lib/schemas';
import {
  changePartyRole,
  getEmailsInvitedToParty,
  getParty,
  getPartyMembers,
  isEmailAlreadyInvitedToParty,
  isUserByEmailInPartyAlready,
  sendPartyInviteEmail
} from '$lib/server';
import { createSha256Hash } from '$lib/utils/hash';
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

  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];

  const inviteMemberForm = await superValidate(zod(inviteMemberSchemaWithPartyId));
  const resendInviteForm = await superValidate(zod(resendInviteSchemaWithPartyId));
  const changeMemberRoleForm = await superValidate(zod(changeRoleSchemeWithPartyId));
  const removeInviteForm = await superValidate(zod(removeInviteSchemaWithPartyId));

  return {
    members,
    invitedEmails,
    changeMemberRoleForm,
    inviteMemberForm,
    resendInviteForm,
    removeInviteForm
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
  }
};
