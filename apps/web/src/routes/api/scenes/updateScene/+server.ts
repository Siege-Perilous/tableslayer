import { updateSceneSchema } from '$lib/db/gs/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty, updateScene } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  dbName: z.string(),
  sceneId: z.string(),
  sceneData: updateSceneSchema,
  partyId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { sceneId, dbName, partyId, sceneData } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    const userId = locals.user.id;

    await updateScene(dbName, userId, sceneId, sceneData);

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
