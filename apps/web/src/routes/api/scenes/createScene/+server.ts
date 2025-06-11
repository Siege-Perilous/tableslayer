import { insertSceneSchema } from '$lib/db/app/schema'; // Use or create a schema for scene creation
import { apiFactory } from '$lib/factories';
import { createScene, isUserInParty } from '$lib/server';
import { z } from 'zod/v4';

const validationSchema = z.object({
  partyId: z.string(),
  sceneData: insertSceneSchema
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId, sceneData } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await createScene(sceneData);

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
