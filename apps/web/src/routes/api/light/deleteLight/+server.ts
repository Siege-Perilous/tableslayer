import { apiFactory } from '$lib/factories';
import { deleteLight, getLight, isUserInParty, updateSceneTimestampForLightChange } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  lightId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { lightId, partyId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    const lightToDelete = await getLight(lightId);

    await deleteLight(lightId);

    if (lightToDelete?.sceneId) {
      await updateSceneTimestampForLightChange(lightToDelete.sceneId);
    }

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to delete this light.',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting the light.'
  }
);
