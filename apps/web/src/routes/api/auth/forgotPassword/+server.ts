import { apiFactory } from '$lib/factories';
import { initiateResetPassword } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  email: z.email()
});

export const POST = apiFactory(
  async ({ body }) => {
    try {
      const { email } = body;

      await initiateResetPassword(email);

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
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
