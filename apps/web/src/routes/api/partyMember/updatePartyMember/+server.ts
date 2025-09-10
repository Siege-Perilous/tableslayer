import { apiFactory } from '$lib/factories';
import { isUserInParty, updatePartyMember } from '$lib/server';
import { z } from 'zod';

const updatePartyMemberSchema = z.object({
  partyId: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'editor', 'viewer'])
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user?.id || !isUserInParty(locals.user.id, body.partyId)) {
      throw new Error('Unauthorized');
    }

    const partyMember = await updatePartyMember(body);

    return { success: true, partyMember };
  },
  {
    validationSchema: updatePartyMemberSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to update party members',
    unexpectedErrorMessage: 'An unexpected error occurred while updating a party member'
  }
);
