import { updatePartyMemberSchema } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { isUserInParty, updatePartyMember } from '$lib/server';

export const POST = apiFactory(
  async ({ body, locals }) => {
    const { partyId } = body;
    if (!partyId) {
      throw new Error('A partyId is required');
    }

    if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
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
