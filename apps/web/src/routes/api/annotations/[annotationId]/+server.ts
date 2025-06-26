import { deleteAnnotation } from '$lib/server/annotations';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  // Check authentication
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { annotationId } = params;

  if (!annotationId) {
    return json({ error: 'Annotation ID is required' }, { status: 400 });
  }

  try {
    // TODO: Add authorization check - ensure user has access to delete this annotation
    // This would require checking party membership and annotation ownership

    // Delete the annotation
    const success = await deleteAnnotation(annotationId);

    if (!success) {
      return json({ error: 'Annotation not found or could not be deleted' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return json({ error: 'Failed to delete annotation' }, { status: 500 });
  }
};
