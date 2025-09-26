import { insertMarkerSchema, updateGameSessionSchema, updateMarkerSchema, updateSceneSchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import {
  createMarker,
  deleteMarker,
  getScene,
  isUserInParty,
  updateGameSession,
  updateMarker,
  updateScene
} from '$lib/server';
import { z } from 'zod';

// Schema for marker operations
const markerOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  id: z.string(),
  data: z.union([insertMarkerSchema, updateMarkerSchema]).optional()
});

// Unified save schema
const savePartyStateSchema = z.object({
  partyId: z.string(),
  gameSessionId: z.string(),
  sceneId: z.string(),
  sceneData: updateSceneSchema,
  gameSessionData: updateGameSessionSchema.optional(),
  markerOperations: z.array(markerOperationSchema).optional(),
  thumbnailLocation: z.string().optional()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const {
      partyId,
      gameSessionId,
      sceneId,
      sceneData,
      gameSessionData,
      markerOperations = [],
      thumbnailLocation
    } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    const userId = locals.user.id;

    // Track results for response
    const results = {
      scene: null as unknown,
      markers: {
        created: [] as unknown[],
        updated: [] as unknown[],
        deleted: [] as string[]
      },
      gameSession: null as unknown
    };

    try {
      // Process all operations in sequence for consistency

      // 1. Update scene data (including thumbnail location if provided)
      const finalSceneData = thumbnailLocation ? { ...sceneData, mapThumbLocation: thumbnailLocation } : sceneData;

      await updateScene(userId, sceneId, finalSceneData);
      results.scene = await getScene(sceneId);

      // 2. Process marker operations
      let markersModified = false;
      for (const operation of markerOperations) {
        switch (operation.operation) {
          case 'create':
            if (!operation.data) {
              throw new Error(`Create operation for marker ${operation.id} missing data`);
            }
            const newMarker = await createMarker(operation.data, sceneId);
            results.markers.created.push(newMarker);
            markersModified = true;
            break;

          case 'update':
            if (!operation.data) {
              throw new Error(`Update operation for marker ${operation.id} missing data`);
            }
            const updatedMarker = await updateMarker(operation.id, operation.data);
            results.markers.updated.push(updatedMarker);
            markersModified = true;
            break;

          case 'delete':
            await deleteMarker(operation.id);
            results.markers.deleted.push(operation.id);
            markersModified = true;
            break;
        }
      }

      // Update scene timestamp if markers were modified
      if (markersModified) {
        await updateScene(userId, sceneId, { lastUpdated: new Date() });
      }

      // 3. Update game session timestamp (if provided)
      if (gameSessionData) {
        await updateGameSession(gameSessionId, {
          ...gameSessionData,
          lastUpdated: new Date()
        });
        // Note: We don't fetch the full game session here for performance
        results.gameSession = { updated: true };
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error in savePartyState:', error);
      throw error;
    }
  },
  {
    validationSchema: savePartyStateSchema,
    validationErrorMessage: 'Invalid save data provided',
    unauthorizedMessage: 'You are not authorized to save this party state.',
    unexpectedErrorMessage: 'An unexpected error occurred while saving party state.'
  }
);
