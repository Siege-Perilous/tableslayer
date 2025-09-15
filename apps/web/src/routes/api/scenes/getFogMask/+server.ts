import { getSceneMaskData } from '$lib/server/scene';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const sceneId = url.searchParams.get('sceneId');

    if (!sceneId) {
      return json({ success: false, error: 'Scene ID is required' }, { status: 400 });
    }

    const maskData = await getSceneMaskData(sceneId);

    // Return the base64 mask data
    return json({
      success: true,
      maskData: maskData.fogOfWarMask
    });
  } catch (error) {
    console.error('Error fetching fog mask:', error);
    return json({ success: false, error: 'Failed to fetch fog mask' }, { status: 500 });
  }
};
