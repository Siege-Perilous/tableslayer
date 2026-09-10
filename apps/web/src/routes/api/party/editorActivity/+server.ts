import { apiFactory } from '$lib/factories';
import { isUserInParty } from '$lib/server';
import { getGameSessionPartyId, recordRealtimeActivity } from '$lib/server/realtime';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  gameSessionId: z.string()
});

// Editors ping this (at most every couple of minutes while active) so a
// sleeping playfield polling /api/party/liveState knows the GM is around.
export const POST = apiFactory(
  async (event) => {
    const userId = event.locals.user?.id;
    if (!userId || !(await isUserInParty(userId, event.body.partyId))) {
      throw new Error('Unauthorized');
    }
    if ((await getGameSessionPartyId(event.body.gameSessionId)) !== event.body.partyId) {
      throw new Error('Game session not found');
    }
    await recordRealtimeActivity({
      partyId: event.body.partyId,
      gameSessionId: event.body.gameSessionId,
      kind: 'editor_active',
      userId
    });
    return { success: true };
  },
  {
    validationSchema,
    unauthorizedMessage: 'You are not a member of this party.',
    unexpectedErrorMessage: 'Failed to record activity.'
  }
);
