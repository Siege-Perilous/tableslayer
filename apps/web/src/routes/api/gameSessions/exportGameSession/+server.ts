import { db } from '$lib/db/app';
import { sceneTable } from '$lib/db/app/schema';
import { getAnnotationMaskData, getAnnotationsForScene } from '$lib/server/annotations';
import { getGameSession } from '$lib/server/gameSession';
import { getMarkersForScene } from '$lib/server/marker';
import { getPartyFromGameSessionId, isUserInParty } from '$lib/server/party/getParty';
import { getScenes } from '$lib/server/scene';
import { error, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import pkg from '../../../../../package.json';

export const POST = async ({ request, locals }: RequestEvent) => {
  try {
    const data = await request.json();

    const schema = z.object({
      gameSessionId: z.uuid()
    });

    const { gameSessionId } = schema.parse(data);

    if (!locals.user?.id) {
      throw error(401, 'Authentication required');
    }

    const gameSession = await getGameSession(gameSessionId);

    const party = await getPartyFromGameSessionId(gameSessionId);

    if (!(await isUserInParty(locals.user.id, party.id))) {
      throw error(403, 'You are not authorized to export this game session');
    }

    const scenes = await getScenes(gameSessionId);

    const scenesWithMarkers = await Promise.all(
      scenes.map(async (scene) => {
        const markers = await getMarkersForScene(scene.id);
        const annotations = await getAnnotationsForScene(scene.id);

        // Get the fogOfWarMask from the database for this scene
        const sceneWithMask = await db
          .select({ fogOfWarMask: sceneTable.fogOfWarMask })
          .from(sceneTable)
          .where(eq(sceneTable.id, scene.id))
          .get();

        // Get annotation masks for each annotation
        const annotationsWithMasks = await Promise.all(
          annotations.map(async (annotation) => {
            const maskData = await getAnnotationMaskData(annotation.id);
            return {
              ...annotation,
              mask: maskData?.mask || null
            };
          })
        );

        // Remove thumb property which is temporary and not needed for export
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { thumb, ...sceneWithoutThumb } = scene as Record<string, unknown>;

        // Remove fog of war URL and lastUpdated as per requirements
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fogOfWarUrl, lastUpdated, ...sceneData } = sceneWithoutThumb;

        return {
          ...sceneData,
          fogOfWarMask: sceneWithMask?.fogOfWarMask || null,
          markers: markers.map((marker) => {
            // Remove thumb property from markers
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { thumb, ...markerWithoutThumb } = marker as Record<string, unknown>;
            return markerWithoutThumb;
          }),
          annotations: annotationsWithMasks
        };
      })
    );

    const exportData = {
      version: pkg.version,
      metadata: {
        exportDate: new Date().toISOString(),
        exportType: 'gameSession'
      },
      gameSession: {
        name: gameSession.name,
        scenes: scenesWithMarkers
      }
    };

    // Set response headers to trigger file download
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tableslayer-gamesession-${gameSession.slug}.json"`
      }
    });
  } catch (err) {
    console.error('Error exporting game session:', err);
    throw error(500, 'Failed to export game session');
  }
};
