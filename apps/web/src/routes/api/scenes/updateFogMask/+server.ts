import { db } from '$lib/db/app/index';
import { sceneTable } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty } from '$lib/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const validationSchema = z.object({
  sceneId: z.string(),
  partyId: z.string(),
  maskData: z.instanceof(Uint8Array).or(z.array(z.number()).transform((arr) => new Uint8Array(arr)))
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { sceneId, partyId, maskData } = body;

    if (!locals.user?.id || !(await isUserInParty(locals.user.id, partyId))) {
      throw new Error('Unauthorized');
    }

    // Update the fog mask in the database
    // Convert Uint8Array to base64 string for storage
    // This avoids blob serialization issues with Turso/LibSQL
    const base64Data = Buffer.from(maskData).toString('base64');

    try {
      // Store as base64 text
      await db
        .update(sceneTable)
        .set({
          fogOfWarMask: base64Data
        })
        .where(eq(sceneTable.id, sceneId))
        .execute();
    } catch (error) {
      console.error('[FOG UPDATE] Database update error:', error);
      console.error('[FOG UPDATE] Base64 length:', base64Data.length);
      console.error('[FOG UPDATE] Scene ID:', sceneId);

      throw new Error(`Database update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Invalid fog mask data',
    unauthorizedMessage: 'You are not authorized to update this scene.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the fog mask.'
  }
);
