import { apiFactory } from '$lib/factories';
import { deletePartyInviteByEmail, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  partyId: z.string(),
  email: z.email()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { email, partyId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      await deletePartyInviteByEmail(partyId, email);

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
