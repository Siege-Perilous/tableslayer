import { insertGameSessionSchema } from '#lib/db/app/schema.js';
import { apiFactory } from '#lib/factories/index.js';
import { createGameSession, isUserAdminInParty, SlugConflictError } from '#lib/server/index.js';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  gameSessionData: insertGameSessionSchema.partial()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { partyId, gameSessionData } = body;

      if (!locals.user?.id || !isUserAdminInParty(locals.user.id, partyId)) {
        throw new Error('Must be an admin to create a game session');
      }

      const gameSession = await createGameSession(partyId, gameSessionData);

      return { success: true, gameSession };
    } catch (error) {
      if (error instanceof SlugConflictError) {
        throw new z.ZodError([
          {
            path: ['gameSessionData', 'name'],
            message: error.message,
            code: 'custom',
            input: body.gameSessionData.name
          }
        ]);
      }
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this game.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
