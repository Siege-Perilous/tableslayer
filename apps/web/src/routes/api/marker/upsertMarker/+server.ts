import { db } from '$lib/db/app';
import { insertMarkerSchema, markerTable } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { createMarker, isUserInParty, updateMarker } from '$lib/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v4';

// Schema for upsert - marker data without sceneId (provided separately)
const markerDataWithoutSceneIdSchema = insertMarkerSchema.omit({ sceneId: true });

const validationSchema = z.object({
  markerData: markerDataWithoutSceneIdSchema,
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { markerData, sceneId, partyId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    // Check if marker exists in database
    const existingMarker = markerData.id
      ? await db.select().from(markerTable).where(eq(markerTable.id, markerData.id)).get()
      : null;

    let marker;
    let operation: 'created' | 'updated';

    if (existingMarker && markerData.id) {
      // Update existing marker
      marker = await updateMarker(markerData.id, markerData);
      operation = 'updated';
    } else {
      // Create new marker with the provided ID
      marker = await createMarker(markerData, sceneId);
      operation = 'created';
    }

    return {
      success: true,
      marker,
      operation
    };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to save markers for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while saving the marker.'
  }
);
