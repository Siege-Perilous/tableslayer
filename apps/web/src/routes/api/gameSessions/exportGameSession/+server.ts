import { getGameSession } from '$lib/server/gameSession';
import { getMarkersForScene } from '$lib/server/marker';
import { getPartyFromGameSessionId, isUserInParty } from '$lib/server/party/getParty';
import { getScenes } from '$lib/server/scene';
import { error, type RequestEvent } from '@sveltejs/kit';
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

        // Remove thumb property which is temporary and not needed for export
        const { thumb, ...sceneWithoutThumb } = scene as any;

        // Remove fog of war URL and lastUpdated as per requirements
        const { fogOfWarUrl, lastUpdated, ...sceneData } = sceneWithoutThumb;

        return {
          ...sceneData,
          markers: markers.map((marker) => {
            // Remove thumb property from markers
            const { thumb, ...markerWithoutThumb } = marker as any;
            return markerWithoutThumb;
          })
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
