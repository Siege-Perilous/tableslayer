import { createGameSession, updateGameSession } from '$lib/server/gameSession';
import { createMarker } from '$lib/server/marker';
import { createScene } from '$lib/server/scene';
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
          z.object({
            id: z.string(),
            name: z.string(),
            order: z.number(),
            markers: z
              .array(
                z.object({
                  id: z.string(),
                  title: z.string()
                })
              )
              .optional()
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

    // Create the game session
    const gameSession = await createGameSession(partyId, {
      name: validatedData.gameSession.name,
      isPaused: validatedData.gameSession.isPaused
    });

    // Create scenes with new IDs but preserve order
    for (const sceneData of validatedData.gameSession.scenes) {
      // Get new ID for this scene
      const newSceneId = sceneIdMap.getOrCreate(sceneData.id);

      // Create the scene with the new ID
      await createScene({
        id: newSceneId,
        name: sceneData.name,
        gameSessionId: gameSession.id,
        order: sceneData.order,
        // Copy all the scene data except for markers, fogOfWarUrl and id
        ...Object.entries(sceneData)
          .filter(([key]) => !['markers', 'fogOfWarUrl', 'id'].includes(key))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      });

      // If this is the first scene, set it as active
      if (sceneData.order === 1) {
        await updateGameSession(gameSession.id, { activeSceneId: newSceneId });
      }

      // Create all markers for this scene
      if (sceneData.markers && sceneData.markers.length > 0) {
        for (const markerData of sceneData.markers) {
          // Create a new ID for this marker
          const newMarkerId = uuidv4();

          // Create the marker with the new ID
          await createMarker(
            {
              ...Object.entries(markerData)
                .filter(([key]) => key !== 'id')
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
              id: newMarkerId
            },
            newSceneId
          );
        }
      }
    }

    return json({
      success: true,
      gameSessionId: gameSession.id,
      message: 'Game session imported successfully'
    });
  } catch (err) {
    console.error('Error importing game session:', err);
    if (err instanceof z.ZodError) {
      throw error(400, 'Invalid import file format');
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to import game session');
  }
};
