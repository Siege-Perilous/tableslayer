import { insertMarkerSchema } from '$lib/db/app/schema'; // Use or create a schema for scene creation
import { apiFactory } from '$lib/factories';
import { createMarker, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  markerData: insertMarkerSchema,
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { markerData, sceneId, partyId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      const marker = await createMarker(markerData, sceneId);

      return { success: true, marker };
    } catch (error) {
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create markers for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the marker.'
  }
);
