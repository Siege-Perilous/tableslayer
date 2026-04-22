import { db } from '$lib/db/app';
import { insertLightSchema, lightTable } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { createLight, isUserInParty, updateLight, updateSceneTimestampForLightChange } from '$lib/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const lightDataWithoutSceneIdSchema = insertLightSchema.omit({ sceneId: true });

const validationSchema = z.object({
  lightData: lightDataWithoutSceneIdSchema,
  partyId: z.string(),
  sceneId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { lightData, sceneId, partyId } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    const existingLight = lightData.id
      ? await db.select().from(lightTable).where(eq(lightTable.id, lightData.id)).get()
      : null;

    let light;
    let operation: 'created' | 'updated';

    if (existingLight && lightData.id) {
      const { id, ...updateData } = lightData;
      light = await updateLight(id, updateData);
      operation = 'updated';
    } else {
      light = await createLight(lightData, sceneId);
      operation = 'created';
    }

    await updateSceneTimestampForLightChange(sceneId);

    return {
      success: true,
      light,
      operation
    };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to save lights for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while saving the light.'
  }
);
