import { getApiKeysForUser, getPartyInvitesForEmail } from '#lib/server/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const parentData = await event.parent();
  const { user, envName } = parentData;
  if (!user) {
    throw new Error('User not found');
  }

  const invites = await getPartyInvitesForEmail(user.email);
  const apiKeys = await getApiKeysForUser(user.id);

  return {
    user,
    invites,
    apiKeys,
    envName
  };
};
