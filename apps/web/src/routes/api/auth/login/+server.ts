import { apiFactory } from '$lib/factories';
import { createSession, generateSessionToken, getUserByEmail, setSessionTokenCookie } from '$lib/server';
import { verifyArgonHash } from '$lib/utils/hash';
import { z } from 'zod';

const validationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const POST = apiFactory(
  async (event) => {
    try {
      if (event.locals.user) {
        throw new Error('Already logged in');
      }
      const { email, password } = event.body;

      const existingUser = await getUserByEmail(email);
      if (!existingUser) {
        throw new Error('Incorrect email or password');
      }

      const validPassword = await verifyArgonHash(existingUser.passwordHash, password);
      if (!validPassword) {
        throw new Error('Incorrect email or password');
      }

      const token = generateSessionToken();
      await createSession(token, existingUser.id.toString());
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
