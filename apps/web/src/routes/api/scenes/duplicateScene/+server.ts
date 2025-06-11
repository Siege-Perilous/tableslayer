import { apiFactory } from '$lib/factories';
import { duplicateScene, isUserInParty } from '$lib/server';
import { z } from 'zod/v4';

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

    return { success: true, scene: newScene };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to duplicate scenes in this game session',
    unexpectedErrorMessage: 'An unexpected error occurred while duplicating the scene'
  }
);
