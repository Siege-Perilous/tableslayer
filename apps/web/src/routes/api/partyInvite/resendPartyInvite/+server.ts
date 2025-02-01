import { apiFactory } from '$lib/factories';
import { isUserInParty, resendPartyInvite } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  email: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { email, partyId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      const partyInvite = await resendPartyInvite(partyId, email);

      return { success: true, partyInvite };
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
