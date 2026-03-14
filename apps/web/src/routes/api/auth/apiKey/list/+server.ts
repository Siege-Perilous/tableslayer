import { apiFactory } from '$lib/factories';
import { getApiKeysForUser } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({});

export const GET = apiFactory(
  async ({ locals }) => {
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    const keys = await getApiKeysForUser(locals.user.id);

    return {
      success: true,
      keys
    };
  },
  {
    validationSchema,
    unauthorizedMessage: 'You must be logged in to view API keys.',
    unexpectedErrorMessage: 'An unexpected error occurred while fetching API keys.'
  }
);
