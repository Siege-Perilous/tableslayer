import { apiFactory } from '$lib/factories';
import { createSession, createUserByEmailAndPassword, generateSessionToken, setSessionTokenCookie } from '$lib/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const validationSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
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
      const userId = uuidv4();
      const { email, password } = event.body;

      await createUserByEmailAndPassword(email, password, userId);

      const token = generateSessionToken();
      await createSession(token, userId.toString());
      setSessionTokenCookie(event, token);

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
