import { apiFactory } from '$lib/factories';
import { deletePartyMember, isUserInParty } from '$lib/server';
import { z } from 'zod';

const validationSchema = z.object({
  userId: z.string(),
  partyId: z.string()
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { userId, partyId } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }

      await deletePartyMember(userId, partyId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting party member', error);
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to delete party members',
    unexpectedErrorMessage: 'An unexpected error occurred while deleting a party member'
  }
);
