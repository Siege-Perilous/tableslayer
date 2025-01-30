import { apiFactory } from '$lib/factories';
import { deleteParty, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await deleteParty(partyId);

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You aren not authorized to delete this party',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting the party'
  }
);
