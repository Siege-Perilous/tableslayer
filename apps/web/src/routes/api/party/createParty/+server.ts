import { insertPartySchema } from '#lib/db/app/schema.js'; // Use or create a schema for scene creation
import { apiFactory } from '#lib/factories/index.js';
import { createParty, SlugConflictError } from '#lib/server/index.js';
import { z } from 'zod';

const validationSchema = z.object({
  // Allow slug to be optional, since it's generated on the server
  partyData: insertPartySchema.omit({ slug: true }).optional()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const partyData = body.partyData;

      if (!locals.user?.id) {
        throw new Error('Unauthorized');
      }
      const userId = locals.user.id;

      const party = await createParty(userId, partyData);

      return { success: true, party };
    } catch (error) {
      if (error instanceof SlugConflictError) {
        throw new z.ZodError([
          {
            path: ['partyData', 'name'],
            message: error.message,
            code: 'custom',
            input: body.partyData?.name
          }
        ]);
      }
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
