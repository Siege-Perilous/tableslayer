import { db } from '$lib/db/app';
import {
  insertMarkerSchema,
  insertSceneSchema,
  markerTable,
  sceneTable,
  type InsertMarker,
  type InsertScene
} from '$lib/db/app/schema';
import { createGameSessionForImport, updateGameSession } from '$lib/server/gameSession';
import { getParty, isUserInParty } from '$lib/server/party/getParty';
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const createIdMap = () => {
  const map = new Map<string, string>();
  return {
    getOrCreate: (oldId: string) => {
      if (!map.has(oldId)) {
        map.set(oldId, uuidv4());
      }
      return map.get(oldId)!;
    }
  };
};

export const POST = async ({ request, locals }: RequestEvent) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const partyId = formData.get('partyId');

    if (!partyId || typeof partyId !== 'string') {
      throw error(400, 'Party ID is required');
    }

    if (!locals.user?.id) {
      throw error(401, 'Authentication required');
    }

    if (!(await isUserInParty(locals.user.id, partyId))) {
      throw error(403, 'You are not a member of this party');
    }

    // Validate input
    if (!file || !(file instanceof File)) {
      throw error(400, 'File is required');
    }

    // Parse the JSON file
    const fileContent = await file.text();
    const importData = JSON.parse(fileContent);
    const party = await getParty(partyId);

    // Basic schema validation
    const schema = z.object({
      version: z.string(),
      metadata: z.object({
        exportDate: z.string(),
        exportType: z.literal('gameSession')
      }),
      gameSession: z.object({
        name: z.string(),
        isPaused: z.boolean(),
        scenes: z.array(
          insertSceneSchema.omit({ gameSessionId: true }).extend({
            markers: z.array(insertMarkerSchema.omit({ sceneId: true })).optional()
          })
        )
      })
    });

    const validatedData = schema.parse(importData);

    // Create ID maps for remapping references
    const sceneIdMap = createIdMap();

    // Create the game session without an initial scene (using our new function)
    const gameSession = await createGameSessionForImport(partyId, {
      name: validatedData.gameSession.name,
      isPaused: validatedData.gameSession.isPaused
    });

    // Sort scenes by order to ensure they're processed in the correct sequence
    const sortedScenes = [...validatedData.gameSession.scenes].sort((a, b) => a.order - b.order);
    console.log(`Importing ${sortedScenes.length} scenes for game session ${gameSession.id}`);

    // Only allow a maximum of 3 scenes for free plan users
    if (sortedScenes.length > 3 && party.plan === 'free') {
      console.warn(`User ${locals.user.id} attempted to import ${sortedScenes.length} scenes on a free plan`);
      throw error(403, 'Pro plan required for more than 3 scenes');
    }

    // Create scenes with new IDs but preserve order
    for (const sceneData of sortedScenes) {
      const newSceneId = sceneIdMap.getOrCreate(sceneData.id!);
      const { mapLocation } = sceneData;

      // Create the scene with the new ID, passing all validated properties
      const sceneToCreate: Partial<InsertScene> = {
        id: newSceneId,
        name: sceneData.name,
        gameSessionId: gameSession.id,
        order: sceneData.order,
        mapLocation: mapLocation || null
      };

      const typedSceneToCreate = sceneToCreate as Partial<InsertScene> & Record<string, unknown>;
      Object.entries(sceneData).forEach(([key, value]) => {
        // Skip properties we handle separately or don't want to include
        if (!['markers', 'fogOfWarUrl', 'id', 'mapLocation'].includes(key)) {
          typedSceneToCreate[key] = value;
        }
      });

      await db
        .insert(sceneTable)
        .values(sceneToCreate as InsertScene)
        .execute();

      // If this is the first scene, set it as active
      if (sceneData.order === 1) {
        await updateGameSession(gameSession.id, { activeSceneId: newSceneId });
      }

      // Create all markers for this scene
      if (sceneData.markers && sceneData.markers.length > 0) {
        for (const markerData of sceneData.markers) {
          const newMarkerId = uuidv4();

          const markerToCreate: Partial<InsertMarker> & Record<string, unknown> = {
            id: newMarkerId,
            ...markerData
          };

          delete markerToCreate.id;
          markerToCreate.id = newMarkerId;

          markerToCreate.sceneId = newSceneId;

          await db
            .insert(markerTable)
            .values(markerToCreate as InsertMarker)
            .execute();
        }
      }
    }

    // Return the count of scenes created directly from the JSON file
    // This ensures we're only counting what was in the file, not what might be in the database
    const importedScenesCount = sortedScenes.length;
    console.log(`Import completed successfully. Created ${importedScenesCount} scenes.`);

    return json({
      success: true,
      gameSessionId: gameSession.id,
      message: 'Game session imported successfully',
      sceneCount: importedScenesCount
    });
  } catch (err) {
    console.error('Error importing game session:', err);
    if (err instanceof z.ZodError) {
      throw error(400, 'Invalid import file format');
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to import game session');
  }
};
