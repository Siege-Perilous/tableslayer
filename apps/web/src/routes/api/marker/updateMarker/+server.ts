import { insertMarkerSchema } from '$lib/db/app/schema'; // Use or create a schema for scene creation
import { apiFactory } from '$lib/factories';
import { isUserInParty, updateMarker, updateSceneTimestampForMarkerChange } from '$lib/server';
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

      // Exclude id from markerData to prevent attempting to update the primary key
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...updateData } = markerData;
      const marker = await updateMarker(markerId, updateData);

      // Update scene timestamp when marker is updated
      if (marker.sceneId) {
        await updateSceneTimestampForMarkerChange(marker.sceneId);
      }

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
