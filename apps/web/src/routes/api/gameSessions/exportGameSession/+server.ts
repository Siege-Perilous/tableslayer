import { getGameSession } from '$lib/server/gameSession';
import { getMarkersForScene } from '$lib/server/marker';
import { getScenes } from '$lib/server/scene';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import pkg from '../../../../../package.json';

export const POST = async ({ request }) => {
  try {
    const data = await request.json();

    const schema = z.object({
      gameSessionId: z.string().uuid()
    });

    const { gameSessionId } = schema.parse(data);

    // Get the game session
    const gameSession = await getGameSession(gameSessionId);

    // Get all scenes for this game session
    const scenes = await getScenes(gameSessionId);

    // For each scene, get all markers
    const scenesWithMarkers = await Promise.all(
      scenes.map(async (scene) => {
        const markers = await getMarkersForScene(scene.id);

        // Remove thumb property which is temporary and not needed for export
        const { thumb, ...sceneWithoutThumb } = scene as any;

        // Remove fog of war URL as per requirements
        const { fogOfWarUrl, ...sceneData } = sceneWithoutThumb;

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

    // Create the export object
    const exportData = {
      version: pkg.version,
      metadata: {
        exportDate: new Date().toISOString(),
        exportType: 'gameSession'
      },
      gameSession: {
        name: gameSession.name,
        isPaused: gameSession.isPaused,
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
