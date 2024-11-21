import { db } from '$lib/db/app';
import { partyInviteTable } from '$lib/db/app/schema';
import { changeRoleSchema, inviteMemberSchema, resendInviteSchema } from '$lib/schemas';
import {
  changePartyRole,
  getEmailsInvitedToParty,
  getParty,
  isEmailAlreadyInvitedToParty,
  isUserByEmailInPartyAlready,
  sendPartyInviteEmail
} from '$lib/server';
import { createSha256Hash } from '$lib/utils/hash';
import { setToastCookie } from '@tableslayer/ui';
import { eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { v4 as uuidv4 } from 'uuid';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { party, user } = await parent();

  if (!party || !user) {
    throw new Error('Party is undefined');
  }

  // Superform schemas
  const inviteMemberSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: inviteMemberSchema.shape.partyId.default(party.id)
  });

  const resendInviteSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: resendInviteSchema.shape.partyId.default(party.id)
  });

  const changeRoleSchemeWithPartyId = changeRoleSchema.extend({
    partyId: changeRoleSchema.shape.partyId.default(party.id)
  });

  const inviteMemberForm = await superValidate(zod(inviteMemberSchemaWithPartyId));
  const resendInviteForm = await superValidate(zod(resendInviteSchemaWithPartyId));
  const changeRoleForm = await superValidate(zod(changeRoleSchemeWithPartyId));

  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];

  return {
    invitedEmails,
    inviteMemberForm,
    resendInviteForm,
    changeRoleForm
  };
};

export const actions: Actions = {
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

      setToastCookie(event, {
        title: `An invite has been sent to ${email}`,
        type: 'success'
      });
      return message(inviteMemberForm, { type: 'success', text: 'Member invited' });
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
      setToastCookie(event, {
        title: `An invite has been sent to ${email}`,
        type: 'success'
      });
      return message(resendInviteForm, { type: 'success', text: 'Invite resent' });
    } catch (error) {
      console.log('Error resending invite', error);
      return message(resendInviteForm, { type: 'error', text: 'Error resending invite' }, { status: 500 });
    }
  },

  changeRole: async (event) => {
    const changeRoleForm = await superValidate(event.request, zod(changeRoleSchema));
    if (!changeRoleForm.valid) {
      return message(changeRoleForm, { type: 'error', text: 'Invalid role' }, { status: 400 });
    }

    const { userId, partyId, role } = changeRoleForm.data;

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
