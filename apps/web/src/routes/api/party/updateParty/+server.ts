import { updatePartySchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty, updateParty } from '$lib/server';
import { z } from 'zod';

const updatePartyDetails = z.object({
  partyId: z.string(),
  partyData: updatePartySchema
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId, partyData } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await updateParty(partyId, partyData);

    return { success: true };
  },
  {
    validationSchema: updatePartyDetails,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
