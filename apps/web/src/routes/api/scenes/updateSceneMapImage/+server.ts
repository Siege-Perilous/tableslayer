import { updateSceneMap } from '$lib/server';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ZodError } from 'zod';

import { updateSceneMapImageSchema } from '$lib/schemas';

export const POST: RequestHandler = async (event) => {
  try {
    const { request, locals } = event;

    if (!locals.user?.id) {
      throw error(401, 'Unauthorized');
    }
    const userId = locals.user.id;

    const formData = await request.formData();
    const sceneId = formData.get('sceneId');
    const dbName = formData.get('dbName');
    const file = formData.get('file') as File | null;

    if (!file) {
      throw error(400, 'File is required.');
    }

    updateSceneMapImageSchema.parse({
      sceneId,
      dbName,
      file
    });

    const validatedSceneId = sceneId as string;
    const validatedDbName = dbName as string;

    updateSceneMap(validatedDbName, validatedSceneId, userId, file);

    return json({ success: true });
  } catch (err) {
    console.error('Failed to update scene map image:', err);
    if (err instanceof ZodError) {
      return new Response(
        JSON.stringify({
          errors: err.issues.map((issue) => issue.message)
        }),
        { status: 422 }
      );
    }
    throw error(500, 'Failed to update scene map image');
  }
};
