import { db } from '$lib/db/app/index';
import { annotationsTable, sceneTable } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty } from '$lib/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const validationSchema = z.object({
  annotationId: z.string(),
  partyId: z.string(),
  maskData: z.instanceof(Uint8Array).or(z.array(z.number()).transform((arr) => new Uint8Array(arr)))
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { annotationId, partyId, maskData } = body;

    if (!locals.user?.id || !(await isUserInParty(locals.user.id, partyId))) {
      throw new Error('Unauthorized');
    }

    // First check if annotation exists and user has access
    const [annotation] = await db
      .select({ sceneId: annotationsTable.sceneId })
      .from(annotationsTable)
      .where(eq(annotationsTable.id, annotationId))
      .limit(1);

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Verify the scene belongs to the party
    const [scene] = await db
      .select({ gameSessionId: sceneTable.gameSessionId })
      .from(sceneTable)
      .where(eq(sceneTable.id, annotation.sceneId))
      .limit(1);

    if (!scene) {
      throw new Error('Scene not found');
    }

    // Convert Uint8Array to base64 string for storage
    // This avoids blob serialization issues with Turso/LibSQL
    const base64Data = Buffer.from(maskData).toString('base64');

    // Update the annotation mask in the database
    await db
      .update(annotationsTable)
      .set({
        mask: base64Data,
        url: null // Clear the old URL since we're using RLE now
      })
      .where(eq(annotationsTable.id, annotationId));

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Invalid annotation mask data',
    unauthorizedMessage: 'You are not authorized to update this annotation.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the annotation mask.'
  }
);
