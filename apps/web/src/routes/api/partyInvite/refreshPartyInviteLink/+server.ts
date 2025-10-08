import { apiFactory } from '$lib/factories';
import { isUserInParty, refreshPartyInviteLink } from '$lib/server';
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

      const { inviteUrl } = await refreshPartyInviteLink(partyId, email);

      return { success: true, inviteUrl };
    } catch (error) {
      console.error('Error refreshing party invite link', error);
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to refresh invite links for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while refreshing the invite link.'
  }
);
