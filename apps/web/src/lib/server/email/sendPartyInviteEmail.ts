import { getParty, sendSingleEmail } from '$lib/server';
import { isValidEmail } from '$lib/utils';

export const sendPartyInviteEmail = async (partyId: string, email: string, code: string) => {
  const party = await getParty(partyId);
  const baseURL = process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:5174';

  if (!party) {
    throw new Error('Party not found, cannot send invite email.');
  }

  if (isValidEmail(email) === false) {
    throw new Error('Invalid email');
  }

  await sendSingleEmail({
    to: email,
    subject: `You've been invited to play with ${party.name} on Table Slayer`,
    html: `You've been invited to play with ${party.name} on Table Slayer. Visit ${baseURL}/accept-invite/${code} to accept.`
  });
};
