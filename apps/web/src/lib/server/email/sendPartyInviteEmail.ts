import { getParty, getPartyInvite, sendSingleEmail } from '$lib/server';
import { isValidEmail } from '$lib/utils';

export const sendPartyInviteEmail = async (partyId: string, email: string) => {
  const party = await getParty(partyId);
  const baseURL = process.env.BASE_URL || 'http://localhost:5174';

  if (!party) {
    throw new Error('Party not found, cannot send invite email.');
  }

  if (isValidEmail(email) === false) {
    throw new Error('Invalid email');
  }

  const invite = await getPartyInvite(party.id, email);

  await sendSingleEmail({
    to: email,
    subject: `You've been invited to play with ${party.name} on Table Slayer`,
    html: `You've been invited to play with ${party.name} on Table Slayer. Visit ${baseURL}/accept-invite/${invite?.code} to accept.`
  });
};
