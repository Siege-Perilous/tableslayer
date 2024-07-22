import { getParty, getPartyInvite, sendSingleEmail } from '$lib/server';
import { isValidEmail } from '$lib/utils';

export const sendPartyInviteEmail = async (partyId: string, email: string) => {
  const party = await getParty(partyId);
  if (!party) {
    throw new Error('Party not found, cannot send invite email.');
  }

  if (isValidEmail(email) === false) {
    throw new Error('Invalid email');
  }

  const invite = await getPartyInvite(party.id, email);

  await sendSingleEmail({
    to: email,
    subject: `You've been invited to play with ${party.name} on Siege Perilous`,
    html: `Visit https://localhot:3000/accept-invite/${invite?.code} to join the party.`
  });
};
