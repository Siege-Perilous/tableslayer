import { getEmailsInvitedToParty, getPartyGameSessionsWithScenes } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { party, user, members } = await parent();

  if (!party || !user) {
    throw new Error('Party is undefined');
  }

  const [invitedEmails, gameSessions] = await Promise.all([
    getEmailsInvitedToParty(party.id),
    getPartyGameSessionsWithScenes(party.id)
  ]);

  return {
    members,
    invitedEmails: invitedEmails || [],
    gameSessions: gameSessions || []
  };
};
