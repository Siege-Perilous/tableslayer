import { apiFactory } from '$lib/factories';
import { getAnnotationMaskData } from '$lib/server/annotations';
import { z } from 'zod';

const validationSchema = z.object({
  annotationId: z.string()
});

export const GET = apiFactory(
  async ({ url }) => {
    const annotationId = url.searchParams.get('annotationId');

    if (!annotationId) {
      throw new Error('Annotation ID is required');
    }

    const maskData = await getAnnotationMaskData(annotationId);

    return {
      maskData: maskData?.mask || null
    };
  },
  {
    validationSchema: z.object({}), // No body validation for GET
    validationErrorMessage: 'Invalid annotation mask request',
    unauthorizedMessage: 'You are not authorized to access this annotation mask.',
    unexpectedErrorMessage: 'An unexpected error occurred while fetching the annotation mask.'
  }
);
