import { getPartyInvitesForEmail, getUserPartiesAndSessions } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const parentData = await event.parent();
  const { user, envName } = parentData;
  if (!user) {
    throw new Error('User or parties not found');
  }
  const email = user.email;

  const userParties = await getUserPartiesAndSessions(user.id);

  const invites = await getPartyInvitesForEmail(email);

  return {
    user,
    userParties,
    invites,
    envName
  };
};
