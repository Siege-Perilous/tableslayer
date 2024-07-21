import { db } from '$lib/db';
import { partyInviteTable } from '$lib/db/schema';
import { inviteMemberSchema, resendInviteSchema } from '$lib/schemas';
import {
  getEmailsInvitedToParty,
  getParty,
  getPartyMembers,
  isEmailAlreadyInvitedToParty,
  isUserByEmailInPartyAlready,
  sendPartyInviteEmail
} from '$lib/server';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { party, user } = await parent();

  if (!party || !user) {
    throw new Error('Party is undefined');
  }

  const inviteMemberSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: inviteMemberSchema.shape.partyId.default(party.id)
  });

  const resendInviteSchemaWithPartyId = inviteMemberSchema.extend({
    partyId: inviteMemberSchema.shape.partyId.default(party.id)
  });

  const members = (await getPartyMembers(party.id)) || [];
  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];

  const inviteMemberForm = await superValidate(zod(inviteMemberSchemaWithPartyId));
  const resendInviteForm = await superValidate(zod(resendInviteSchemaWithPartyId));

  return {
    members,
    invitedEmails,
    inviteMemberForm,
    resendInviteForm
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
        invitedBy: userId
      });

      await sendPartyInviteEmail(partyId, email);
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
      await sendPartyInviteEmail(partyId, email);
      return message(resendInviteForm, { type: 'success', text: 'Invite resent' });
    } catch (error) {
      console.log('Error resending invite', error);
      return message(resendInviteForm, { type: 'error', text: 'Error resending invite' }, { status: 500 });
    }
  }
};
