import { db } from '$lib/db/app';
import {
  insertMarkerSchema,
  insertSceneSchema,
  markerTable,
  sceneTable,
  type InsertMarker,
  type InsertScene
} from '$lib/db/app/schema';
import { copySceneFile } from '$lib/server/file';
import { createGameSessionForImport } from '$lib/server/gameSession';
import { getParty, getPartyFromGameSessionId, isUserInParty } from '$lib/server/party/getParty';
import { setActiveSceneForParty } from '$lib/server/scene';
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

    // Sort scenes by order to ensure they're processed in the correct sequence
    const sortedScenes = [...validatedData.gameSession.scenes].sort((a, b) => a.order - b.order);

    // Only allow a maximum of 3 scenes for free plan users
    if (sortedScenes.length > 3 && party.plan === 'free') {
      console.warn(`User ${locals.user.id} attempted to import ${sortedScenes.length} scenes on a free plan`);
      // Instead of using SvelteKit's error function, return a JSON response directly
      return json(
        {
          success: false,
          status: 403,
          message: 'Pro plan required for more than 3 scenes'
        },
        { status: 403 }
      );
    }

    // Create the game session without an initial scene (using our new function)
    const gameSession = await createGameSessionForImport(partyId, {
      name: validatedData.gameSession.name
    });

    // Create scenes with new IDs but preserve order
    for (const sceneData of sortedScenes) {
      const newSceneId = sceneIdMap.getOrCreate(sceneData.id!);
      let { mapLocation, mapThumbLocation } = sceneData;

      // Copy map and thumbnail files to new locations based on new scene ID
      if (mapLocation) {
        try {
          mapLocation = await copySceneFile(mapLocation, newSceneId, 'map');
        } catch (err) {
          console.error('Error copying map file during import:', err);
          // If copy fails, clear the location to avoid broken references
          mapLocation = null;
        }
      }

      if (mapThumbLocation) {
        try {
          mapThumbLocation = await copySceneFile(mapThumbLocation, newSceneId, 'thumbnail');
        } catch (err) {
          console.error('Error copying thumbnail file during import:', err);
          // If copy fails, clear the location to avoid broken references
          mapThumbLocation = null;
        }
      }

      // Create the scene with the new ID, passing all validated properties
      const sceneToCreate: Partial<InsertScene> = {
        id: newSceneId,
        name: sceneData.name,
        gameSessionId: gameSession.id,
        order: sceneData.order,
        mapLocation: mapLocation || null,
        mapThumbLocation: mapThumbLocation || null,
        fogOfWarUrl: null // Reset fog of war for imported scenes
      };

      const typedSceneToCreate = sceneToCreate as Partial<InsertScene> & Record<string, unknown>;
      Object.entries(sceneData).forEach(([key, value]) => {
        // Skip properties we handle separately or don't want to include
        // Also skip lastUpdated as it should be set by the database on creation
        if (!['markers', 'fogOfWarUrl', 'id', 'mapLocation', 'mapThumbLocation', 'lastUpdated'].includes(key)) {
          typedSceneToCreate[key] = value;
        }
      });

      await db
        .insert(sceneTable)
        .values(sceneToCreate as InsertScene)
        .execute();

      // If this is the first scene and party doesn't have an active scene, set it as party's active scene
      if (sceneData.order === 1) {
        const party = await getPartyFromGameSessionId(gameSession.id);
        if (!party.activeSceneId) {
          await setActiveSceneForParty(party.id, newSceneId);
        }
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

    return json({
      success: true,
      gameSessionId: gameSession.id,
      message: 'Game session imported successfully',
      sceneCount: importedScenesCount
    });
  } catch (err) {
    console.error('Error importing game session:', err);

    if (err instanceof z.ZodError) {
      return json(
        {
          success: false,
          status: 400,
          message: 'Invalid import file format',
          errors: err.issues
        },
        { status: 400 }
      );
    }

    // Handle the specific pro plan requirement error
    if (
      err instanceof Error &&
      'status' in err &&
      err.status === 403 &&
      err.message === 'Pro plan required for more than 3 scenes'
    ) {
      return json(
        {
          success: false,
          status: 403,
          message: 'Pro plan required for more than 3 scenes'
        },
        { status: 403 }
      );
    }

    // Handle other HTTP errors
    if (err instanceof Error && 'status' in err && typeof err.status === 'number') {
      return json(
        {
          success: false,
          status: err.status,
          message: err.message
        },
        { status: err.status }
      );
    }

    // Handle unexpected errors
    return json(
      {
        success: false,
        status: 500,
        message: err instanceof Error ? err.message : 'Failed to import game session'
      },
      { status: 500 }
    );
  }
};
