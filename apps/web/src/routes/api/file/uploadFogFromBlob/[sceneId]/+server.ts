import { uploadFogFromBlob } from '$lib/server';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals, params }) => {
  try {
    const { sceneId } = params;
    const userId = locals.user.id as string;

    if (!userId || !sceneId) {
      throw error(400, 'Invalid request');
    }

    const contentType = request.headers.get('content-type');
    if (!contentType) {
      throw error(400, 'Missing content-type header');
    }

    const blobBuffer = await request.arrayBuffer();
    const blob = new Blob([blobBuffer], { type: contentType });

    const fogLocation = await uploadFogFromBlob(sceneId, blob);

    if (!fogLocation) {
      throw error(500, 'File upload failed');
    }

    return json({ location: fogLocation });
  } catch (err) {
    console.error('Error during blob upload:', err);
    throw error(500, 'Internal server error');
  }
};
