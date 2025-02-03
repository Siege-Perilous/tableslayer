import { apiFactory } from '$lib/factories';
import { changeUserEmail } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  newEmail: z.string().email()
});

export const POST = apiFactory(
  async (event) => {
    try {
      if (!event.locals.user) {
        throw new Error('Must be logged in to change email');
      }
      const userId = event.locals.user.id;
      const { newEmail } = event.body;

      await changeUserEmail(userId, newEmail);

      return { success: true };
    } catch (e) {
      console.error('Login error:', e);
      throw new Error('Incorrect email or password');
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized',
    unexpectedErrorMessage: 'An unexpected error occurred'
  }
);
