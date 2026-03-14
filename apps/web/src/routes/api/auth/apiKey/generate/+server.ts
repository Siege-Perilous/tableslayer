import { apiFactory } from '$lib/factories';
import { generateApiKey } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less')
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user) {
      throw new Error('Unauthorized');
    }

    const { key, keyId } = await generateApiKey(locals.user.id, body.name);

    return {
      success: true,
      key,
      keyId,
      name: body.name
    };
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You must be logged in to generate an API key.',
    unexpectedErrorMessage: 'An unexpected error occurred while generating the API key.'
  }
);
