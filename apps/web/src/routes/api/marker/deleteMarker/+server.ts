import { apiFactory } from '$lib/factories';
import { deleteMarker, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  markerId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { markerId, partyId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      const marker = await deleteMarker(markerId);

      return { success: true, marker };
    } catch (error) {
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to delete this marker.',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting the marker.'
  }
);
