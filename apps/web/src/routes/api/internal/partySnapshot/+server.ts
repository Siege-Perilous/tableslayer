import { apiFactory } from '$lib/factories';
import { assertInternalRequest, getPartyStateSnapshot } from '$lib/server/realtime';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string()
});

// Called by the PartyKit party server to hydrate the party room's Y doc.
export const POST = apiFactory(
  async (event) => {
    assertInternalRequest(event.request);
    return await getPartyStateSnapshot(event.body.partyId);
  },
  {
    validationSchema,
    unauthorizedMessage: 'Invalid internal token.',
    unexpectedErrorMessage: 'Failed to load party state.'
  }
);
