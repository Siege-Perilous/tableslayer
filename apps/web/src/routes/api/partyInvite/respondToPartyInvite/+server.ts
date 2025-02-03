import { apiFactory } from '$lib/factories';
import { acceptPartyInvite, declinePartyInvite } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  code: z.string(),
  accepted: z.boolean()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { code, accepted } = body;

      if (!accepted) {
        await declinePartyInvite(code);
      }

      if (!locals.user?.id || !code) {
        throw new Error('Unauthorized');
      }
      const userId = locals.user.id;

      await acceptPartyInvite(code, userId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting party invite', error);
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
