import { updateGameSessionSettingsSchema } from '$lib/db/gs/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty, updateGameSessionSettings } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  dbName: z.string(),
  partyId: z.string(),
  settings: updateGameSessionSettingsSchema
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { dbName, partyId, settings } = body;

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
      throw new Error('Unauthorized');
    }

    await updateGameSessionSettings(dbName, settings);

    return { success: true };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this game.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
