import { insertAnnotationSchema } from '$lib/db/app/schema';
import { upsertAnnotation } from '$lib/server/annotations';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate the annotation data
    const validatedData = insertAnnotationSchema.parse(body);

    // TODO: Add authorization check - ensure user has access to the scene
    // This would require checking party membership and scene ownership

    // Upsert the annotation
    const result = await upsertAnnotation(validatedData);

    if (!result) {
      return json({ error: 'Failed to save annotation' }, { status: 500 });
    }

    return json(result);
  } catch (error) {
    console.error('Error upserting annotation:', error);
    return json({ error: 'Invalid request data' }, { status: 400 });
  }
};
