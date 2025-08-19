import { apiFactory } from '$lib/factories';
import { duplicateScene, getScenes, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId, sceneId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    const newScene = await duplicateScene(sceneId);

    if (!newScene) {
      throw new Error('Failed to duplicate scene');
    }

    // Get the updated scenes list to ensure proper ordering
    const gameSessionId = newScene.gameSessionId;
    const updatedScenes = await getScenes(gameSessionId);

    return { success: true, scene: newScene, scenes: updatedScenes };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to duplicate scenes in this game session',
    unexpectedErrorMessage: 'An unexpected error occurred while duplicating the scene'
  }
);
