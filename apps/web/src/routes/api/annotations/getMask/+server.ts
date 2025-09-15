import { getAnnotationMaskData } from '$lib/server/annotations';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const annotationId = url.searchParams.get('annotationId');

    if (!annotationId) {
      return json({ success: false, error: 'Annotation ID is required' }, { status: 400 });
    }

    const maskData = await getAnnotationMaskData(annotationId);

    // Return the base64 mask data
    return json({
      success: true,
      maskData: maskData?.mask || null
    });
  } catch (error) {
    console.error('Error fetching annotation mask:', error);
    return json({ success: false, error: 'Failed to fetch annotation mask' }, { status: 500 });
  }
};
