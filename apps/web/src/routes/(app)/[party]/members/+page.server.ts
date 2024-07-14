import { db } from '$lib/db';
import { partyInviteTable } from '$lib/db/schema';
import {
  getParty,
  getPartyMembers,
  isEmailAlreadyInvitedToParty,
  isUserByEmailInPartyAlready,
  sendPartyInviteEmail
} from '$lib/server';
import { isValidEmail } from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ parent }) => {
  const { party } = await parent();

  if (!party) {
    throw new Error('Party is undefined');
  }

  const members = (await getPartyMembers(party.id)) || [];

  return {
    members
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  inviteMember: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get('email');
    const partyId = formData.get('partyId') as string;
    const party = await getParty(partyId);

    if (typeof email !== 'string' || !isValidEmail(email)) {
      return {
        status: 400,
        message: 'Invalid email'
      };
    }

    if (!party) {
      throw new Error('Party not found');
    }

    const alreadyInParty = await isUserByEmailInPartyAlready(email, partyId);

    if (alreadyInParty) {
      return {
        status: 400,
        message: 'A user of that email is already in the party'
      };
    }

    const alreadyInvited = await isEmailAlreadyInvitedToParty(email, partyId);

    if (alreadyInvited) {
      return {
        status: 400,
        message: 'This email is already invited'
      };
    }

    try {
      await db.insert(partyInviteTable).values({
        partyId,
        email,
        role: 'viewer'
      });

      await sendPartyInviteEmail(partyId, email);
      return {
        message: 'Email invitation sent'
      };
    } catch (error) {
      console.error('Error inviting member', error);
      return {
        status: 500,
        message: 'Error inviting member'
      };
    }
  }
};
