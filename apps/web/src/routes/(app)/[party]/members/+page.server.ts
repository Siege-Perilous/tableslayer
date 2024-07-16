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
  const { party } = await parent();

  if (!party) {
    throw new Error('Party is undefined');
  }

  const members = (await getPartyMembers(party.id)) || [];
  const invitedEmails = (await getEmailsInvitedToParty(party.id)) || [];

  const inviteMemberForm = await superValidate(zod(inviteMemberSchema));
  const resendInviteForm = await superValidate(zod(resendInviteSchema));

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
      return message(inviteMemberForm, 'Invalid email address', { status: 400 });
    }

    const { email, partyId } = inviteMemberForm.data;
    const party = await getParty(partyId);

    if (!party) {
      throw new Error('Party not found');
    }

    const alreadyInParty = await isUserByEmailInPartyAlready(email, partyId);
    if (alreadyInParty) {
      return message(inviteMemberForm, 'A user of that email is already in the party', { status: 400 });
    }

    const alreadyInvited = await isEmailAlreadyInvitedToParty(email, partyId);
    if (alreadyInvited) {
      return message(inviteMemberForm, 'This email is already invited', { status: 400 });
    }

    try {
      await db.insert(partyInviteTable).values({
        partyId,
        email,
        role: 'viewer'
      });

      await sendPartyInviteEmail(partyId, email);
      return message(inviteMemberForm, 'Email invitation sent');
    } catch (error) {
      console.error('Error inviting member', error);
      return message(inviteMemberForm, 'Error inviting member', { status: 500 });
    }
  },

  resendInvite: async (event) => {
    const resendInviteForm = await superValidate(event.request, zod(resendInviteSchema));
    if (!resendInviteForm.valid) {
      return message(resendInviteForm, 'Invalid email address', { status: 400 });
    }

    const { email, partyId } = resendInviteForm.data;

    try {
      await sendPartyInviteEmail(partyId, email);
      return message(resendInviteForm, 'Email invitation sent');
    } catch (error) {
      console.error('Error resending invite', error);
      return message(resendInviteForm, 'Error resending invite', { status: 500 });
    }
  }
};
