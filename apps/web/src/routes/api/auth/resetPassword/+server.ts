import { apiFactory } from '$lib/factories';
import { createSession, generateSessionToken, resetPassword, setSessionTokenCookie } from '$lib/server';
import { z } from 'zod';

const validationSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    code: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const POST = apiFactory(
  async (event) => {
    let userId: string | undefined = undefined;
    if (event.locals.user) {
      userId = event.locals.user.id;
    }

    try {
      const { password, code } = event.body;

      const user = await resetPassword(code, password, userId);

      const token = generateSessionToken();
      await createSession(token, user.id);
      setSessionTokenCookie(event, token);

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
