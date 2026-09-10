import { apiFactory } from '$lib/factories';
import { isUserInParty } from '$lib/server';
import { getPartyLiveState } from '$lib/server/realtime';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string()
});

// Polled by a sleeping playfield (every 20 s) to decide whether to reconnect.
// Reads the DB, never a room, so polling costs no Durable Object time.
export const POST = apiFactory(
  async (event) => {
    const userId = event.locals.user?.id;
    if (!userId || !(await isUserInParty(userId, event.body.partyId))) {
      throw new Error('Unauthorized');
    }
    const state = await getPartyLiveState(event.body.partyId);
    return { success: true, ...state };
  },
  {
    validationSchema,
    unauthorizedMessage: 'You are not a member of this party.',
    unexpectedErrorMessage: 'Failed to load party state.'
  }
);
