import { updateSceneSchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { getScene, isSceneInParty, isUserInParty, updateScene } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  sceneId: z.string(),
  sceneData: updateSceneSchema,
  partyId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { sceneId, partyId, sceneData } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    // Validate that the scene belongs to this party
    if (!(await isSceneInParty(sceneId, partyId))) {
      throw new Error('Scene does not belong to this party');
    }

    const userId = locals.user.id;

    await updateScene(userId, sceneId, sceneData);

    // Return the updated scene with thumbnails
    const updatedScene = await getScene(sceneId);

    return { success: true, scene: updatedScene };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
