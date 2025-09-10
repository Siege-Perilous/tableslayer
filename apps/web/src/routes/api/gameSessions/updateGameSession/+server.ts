import { updateGameSessionSchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { isUserAdminInParty, SlugConflictError, updateGameSession } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  gameSessionId: z.string(),
  gameSessionData: updateGameSessionSchema.partial().extend({
    lastUpdated: z.coerce.date().optional()
  })
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { partyId, gameSessionId, gameSessionData } = body;

      if (!locals.user?.id || !isUserAdminInParty(locals.user.id, partyId)) {
        throw new Error('Must be an admin to update a game session');
      }

      const gameSession = await updateGameSession(gameSessionId, gameSessionData);

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
    unauthorizedMessage: 'You are not authorized to update this session.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the session.'
  }
);
