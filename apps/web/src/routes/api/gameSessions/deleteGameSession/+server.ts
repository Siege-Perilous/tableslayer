import { apiFactory } from '$lib/factories';
import { deleteGameSession, isUserAdminInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  gameSessionId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId, gameSessionId } = body;

    if (!locals.user?.id || !isUserAdminInParty(locals.user.id, partyId)) {
      throw new Error('Must be an admin to create a game session');
    }

    await deleteGameSession(gameSessionId);

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this game.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
