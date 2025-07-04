import { apiFactory } from '$lib/factories';
import { deleteScene, getScenes, isUserInParty } from '$lib/server';
import { z } from 'zod/v4';

const validationSchema = z.object({
  gameSessionId: z.string(),
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { gameSessionId, partyId, sceneId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await deleteScene(gameSessionId, sceneId);

    // Return the updated scenes list with corrected order
    const updatedScenes = await getScenes(gameSessionId);

    return { success: true, scenes: updatedScenes };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You aren not authorized to delete this scene',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting the scene.'
  }
);
