import { apiFactory } from '$lib/factories';
import {
  createSession,
  createUserByEmailAndPassword,
  generateSessionToken,
  isTurnstileEnabled,
  setSessionTokenCookie
} from '$lib/server';
import { verifyTurnstileToken } from '$lib/server/turnstile';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const validationSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    turnstileToken: z.string().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const POST = apiFactory(
  async (event) => {
    try {
      if (event.locals.user) {
        throw new Error('Already logged in');
      }
      const { email, password, turnstileToken } = event.body;

      if (isTurnstileEnabled() && !(await verifyTurnstileToken(turnstileToken))) {
        throw new Error('Bot check failed. Please try again.');
      }

      const userId = uuidv4();
      await createUserByEmailAndPassword(email, password, userId);

      const token = generateSessionToken();
      await createSession(token, userId.toString());
      setSessionTokenCookie(event, token);

      return { success: true };
    } catch (e) {
      const error = e as Error;
      throw new Error(error.message);
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized',
    unexpectedErrorMessage: 'An unexpected error occurred'
  }
);
