import { insertSceneSchema } from '$lib/db/app/schema'; // Use or create a schema for scene creation
import { apiFactory } from '$lib/factories';
import { createScene, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  // Scene order uses fractional indexing in the session doc (see orderBetween), so a
  // duplicated/inserted scene can carry a non-integer order. Relax the schema's int
  // constraint on this one field; SQLite's integer affinity stores the real value fine.
  sceneData: insertSceneSchema.extend({ order: z.number().optional() })
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId, sceneData } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    const scene = await createScene(sceneData);

    return { success: true, scene };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
