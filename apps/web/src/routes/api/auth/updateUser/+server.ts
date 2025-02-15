import { updateUserSchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { EmailAlreadyInUseError, updateUser } from '$lib/server';
import { z } from 'zod';

const updateUserValidation = z.object({
  userData: updateUserSchema
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      if (!locals.user) {
        throw new Error('Unauthorized');
      }

      const userId = locals.user.id;

      const { userData } = body;

      const response = await updateUser(userId, userData);

      return { sucess: true, user: response.user, emailWasChanged: response.emailWasChanged };
    } catch (error) {
      if (error instanceof EmailAlreadyInUseError) {
        throw new z.ZodError([
          {
            path: ['userData', 'email'],
            message: error.message,
            code: 'custom'
          }
        ]);
      }
      throw error;
    }
  },
  {
    validationSchema: updateUserValidation,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while updating the party.'
  }
);
