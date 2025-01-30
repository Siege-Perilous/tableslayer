import { updatePartySchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty, SlugConflictError, updateParty } from '$lib/server';
import { z } from 'zod';

const updatePartyDetails = z.object({
  partyId: z.string(),
  partyData: updatePartySchema
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { partyId, partyData } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      const party = await updateParty(partyId, partyData);
      return { success: true, party };
    } catch (error) {
      if (error instanceof SlugConflictError) {
        throw new z.ZodError([
          {
            path: ['partyData', 'name'],
            message: error.message,
            code: 'custom'
          }
        ]);
      }
      throw error;
    }
  },
  {
    validationSchema: updatePartyDetails,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
