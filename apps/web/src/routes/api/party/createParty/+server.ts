import { insertPartySchema } from '$lib/db/app/schema'; // Use or create a schema for scene creation
import { apiFactory } from '$lib/factories';
import { createParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyData: insertPartySchema.optional()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const partyData = body.partyData;

    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }
    const userId = locals.user.id;

    const party = await createParty(userId, partyData);

    return { success: true, party };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
