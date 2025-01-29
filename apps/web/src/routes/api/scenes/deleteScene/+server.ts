import { apiFactory } from '$lib/factories';
import { deleteScene, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  dbName: z.string(),
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { dbName, partyId, sceneId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await deleteScene(dbName, sceneId);

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You aren not authorized to delete this scene',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting the scene.'
  }
);
