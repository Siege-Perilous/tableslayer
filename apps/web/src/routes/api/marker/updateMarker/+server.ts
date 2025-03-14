import { insertMarkerSchema } from '$lib/db/app/schema'; // Use or create a schema for scene creation
import { apiFactory } from '$lib/factories';
import { isUserInParty, updateMarker } from '$lib/server';
import { z } from 'zod';

// Create a custom schema that doesn't require sceneId in markerData for updates
const markerDataWithoutSceneIdSchema = insertMarkerSchema.partial().omit({ sceneId: true });

const validationSchema = z.object({
  markerData: markerDataWithoutSceneIdSchema,
  partyId: z.string(),
  markerId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { markerData, markerId, partyId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      const marker = await updateMarker(markerId, markerData);

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
