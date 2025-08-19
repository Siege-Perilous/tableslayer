import { apiFactory } from '$lib/factories';
import { resendVerifyEmail } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  userId: z.string()
});

export const POST = apiFactory(
  async (event) => {
    try {
      if (!event.locals.user) {
        throw new Error('Must be logged in to change email');
      }
      const userId = event.locals.user.id;

      await resendVerifyEmail(userId);

      return { success: true };
    } catch (error) {
      console.error('Resend verify email error', error);
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized',
    unexpectedErrorMessage: 'An unexpected error occurred'
  }
);
