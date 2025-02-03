import { getPartyInvitesForEmail } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { user, parties } = await event.parent();
  if (!user || !parties) {
    throw new Error('User or parties not found');
  }
  const email = user.email;

  const invites = await getPartyInvitesForEmail(email);

  return {
    invites,
    parties
  };
};
