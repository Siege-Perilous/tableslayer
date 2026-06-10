import { apiFactory } from '$lib/factories';
import { assertInternalRequest, buildSessionSnapshot } from '$lib/server/realtime';
import { z } from 'zod';

const validationSchema = z.object({
  gameSessionId: z.string()
});

// Called by the PartyKit game session server to hydrate a room's Y doc from the DB.
export const POST = apiFactory(
  async (event) => {
    assertInternalRequest(event.request);
    return await buildSessionSnapshot(event.body.gameSessionId);
  },
  {
    validationSchema,
    unauthorizedMessage: 'Invalid internal token.',
    unexpectedErrorMessage: 'Failed to build session snapshot.'
  }
);
