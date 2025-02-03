import { apiFactory } from '$lib/factories';
import { verifyEmail } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  code: z.string()
});

export const POST = apiFactory(
  async ({ locals, body }) => {
    try {
      if (!locals.user) {
        throw new Error('Must be logged in to change email');
      }
      const userId = locals.user.id;
      const { code } = body;
      await verifyEmail(userId, code);

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
