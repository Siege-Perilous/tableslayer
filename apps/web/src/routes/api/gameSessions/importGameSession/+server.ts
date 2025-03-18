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
import { getScenes } from '$lib/server/scene';
import { error, json } from '@sveltejs/kit';
import semver from 'semver';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pkg from '../../../../../package.json';

// Utility function to remap IDs
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

export const POST = async ({ request, locals }) => {
  try {
    // Get the multipart/form-data content
    const formData = await request.formData();
    const file = formData.get('file');
    const partyId = formData.get('partyId');

    // Validate input
    if (!file || !(file instanceof File)) {
      throw error(400, 'File is required');
    }

    if (!partyId || typeof partyId !== 'string') {
      throw error(400, 'Party ID is required');
    }

    // Parse the JSON file
    const fileContent = await file.text();
    const importData = JSON.parse(fileContent);

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

    // Check version compatibility
    if (semver.gt(validatedData.version, pkg.version)) {
      throw error(400, 'Import file is from a newer version and may not be compatible');
    }

    // Create ID maps for remapping references
    const sceneIdMap = createIdMap();

    // Create the game session without an initial scene (using our new function)
    const gameSession = await createGameSessionForImport(partyId, {
      name: validatedData.gameSession.name,
      isPaused: validatedData.gameSession.isPaused
    });

    // Sort scenes by order to ensure they're processed in the correct sequence
    const sortedScenes = [...validatedData.gameSession.scenes].sort((a, b) => a.order - b.order);
    console.log(`Processing ${sortedScenes.length} scenes in order: ${sortedScenes.map((s) => s.order).join(', ')}`);

    // Create scenes with new IDs but preserve order
    for (const sceneData of sortedScenes) {
      // Get new ID for this scene
      const newSceneId = sceneIdMap.getOrCreate(sceneData.id);

      // Extract mapLocation explicitly
      const { mapLocation } = sceneData;

      console.log(`Importing scene "${sceneData.name}" with map location: ${mapLocation || 'none'}`);

      // Create the scene with the new ID, passing all validated properties
      // First create a clean scene object with the required fields
      const sceneToCreate: Partial<InsertScene> = {
        id: newSceneId,
        name: sceneData.name,
        gameSessionId: gameSession.id,
        order: sceneData.order,
        mapLocation: mapLocation || null // Explicitly pass mapLocation, ensuring null if undefined
      };

      // Add all other properties from the validated data
      // This will include all scene settings like grid, effects, weather, etc.
      const typedSceneToCreate = sceneToCreate as Partial<InsertScene> & Record<string, unknown>;
      Object.entries(sceneData).forEach(([key, value]) => {
        // Skip properties we handle separately or don't want to include
        if (!['markers', 'fogOfWarUrl', 'id', 'mapLocation'].includes(key)) {
          typedSceneToCreate[key] = value;
        }
      });

      console.log(
        `Creating scene with settings:`,
        Object.keys(sceneToCreate).filter(
          (key) => !['id', 'name', 'gameSessionId', 'order', 'mapLocation'].includes(key)
        )
      );

      // Instead of using createScene which might override with defaults,
      // directly insert into the database to preserve all imported settings
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
          // Create a new ID for this marker
          const newMarkerId = uuidv4();

          // Create the marker with the new ID and all properties
          const markerToCreate: Partial<InsertMarker> & Record<string, unknown> = {
            id: newMarkerId,
            ...markerData
          };

          // Replace the original ID with our new one
          delete markerToCreate.id;
          markerToCreate.id = newMarkerId;

          // Add the sceneId to the marker
          markerToCreate.sceneId = newSceneId;

          // Directly insert the marker to preserve all properties
          await db
            .insert(markerTable)
            .values(markerToCreate as InsertMarker)
            .execute();
        }
      }
    }

    // Get the imported scenes for verification
    const importedScenes = await getScenes(gameSession.id);
    console.log(`Import completed successfully. Created ${importedScenes.length} scenes.`);

    // Log order of scenes to ensure they're in the correct sequence
    console.log(`Final scene order: ${importedScenes.map((s) => `${s.name} (order: ${s.order})`).join(', ')}`);

    return json({
      success: true,
      gameSessionId: gameSession.id,
      message: 'Game session imported successfully',
      sceneCount: importedScenes.length
    });
  } catch (err) {
    console.error('Error importing game session:', err);
    if (err instanceof z.ZodError) {
      throw error(400, 'Invalid import file format');
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to import game session');
  }
};
