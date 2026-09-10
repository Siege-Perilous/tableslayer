import { apiFactory } from '$lib/factories';
import { applyPartyStatePersist, assertInternalRequest, recordRealtimeActivity } from '$lib/server/realtime';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  activeSceneId: z.string().nullable(),
  isPaused: z.boolean()
});

// Called by the PartyKit party server's debounced persister.
export const POST = apiFactory(
  async (event) => {
    assertInternalRequest(event.request);
    await applyPartyStatePersist(event.body.partyId, {
      activeSceneId: event.body.activeSceneId,
      isPaused: event.body.isPaused
    });
    try {
      await recordRealtimeActivity({ partyId: event.body.partyId, kind: 'party_state' });
    } catch (error) {
      console.warn('realtime activity (party_state) failed', error);
    }
    return { ok: true };
  },
  {
    validationSchema,
    unauthorizedMessage: 'Invalid internal token.',
    unexpectedErrorMessage: 'Failed to persist party state.'
  }
);
