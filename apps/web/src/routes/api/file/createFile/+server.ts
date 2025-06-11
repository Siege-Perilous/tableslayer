import { apiFactory } from '$lib/factories';
import { createUserFileFromLocation } from '$lib/server';
import { z } from 'zod/v4';

const validationSchema = z.object({
  location: z.string().min(1, 'File location cannot be empty')
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { location } = body;

    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = locals.user.id;
    const fileDetails = await createUserFileFromLocation(location, userId);

    return fileDetails;
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
