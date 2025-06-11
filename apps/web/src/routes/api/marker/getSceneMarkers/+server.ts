import { apiFactory } from '$lib/factories';
import { getMarkersForScene, isUserInParty } from '$lib/server';
import { z } from 'zod/v4';

const validationSchema = z.object({
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { partyId, sceneId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      const marker = await getMarkersForScene(sceneId);

      return { success: true, marker };
    } catch (error) {
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to upate this marker.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the marker.'
  }
);
