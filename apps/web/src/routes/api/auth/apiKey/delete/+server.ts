import { apiFactory } from '$lib/factories';
import { deleteApiKey } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  keyId: z.string().uuid('Invalid key ID')
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    const deleted = await deleteApiKey(body.keyId, locals.user.id);

    if (!deleted) {
      throw new Error('API key not found');
    }

    return {
      success: true
    };
  },
  {
    validationSchema,
    validationErrorMessage: 'Invalid key ID',
    unauthorizedMessage: 'You must be logged in to delete an API key.',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting the API key.'
  }
);
