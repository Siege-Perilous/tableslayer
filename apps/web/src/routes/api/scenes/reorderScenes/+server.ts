import { apiFactory } from '$lib/factories';
import { getScenes, isUserInParty, reorderScenes } from '$lib/server';
import { z } from 'zod/v4';

const validationSchema = z.object({
  partyId: z.string(),
  gameSessionId: z.string(),
  sceneId: z.string(),
  newOrder: z.number().int().positive(),
  oldOrder: z.number().int().positive()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId, gameSessionId, sceneId, newOrder } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await reorderScenes(gameSessionId, sceneId, newOrder);

    // Return the updated scenes list
    const scenes = await getScenes(gameSessionId);

    return { success: true, scenes };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to reorder scenes in this game session',
    unexpectedErrorMessage: 'An unexpected error occurred while reordering scenes'
  }
);
