import { VALID_PARTY_ROLES } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { createPartyInvite, isUserInParty, UserAlreadyInPartyError, UserAlreadyInvitedError } from '$lib/server';
import { z } from 'zod/v4';

const validationSchema = z.object({
  email: z.email(),
  partyId: z.string(),
  role: z.enum(VALID_PARTY_ROLES)
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    try {
      const { email, partyId, role } = body;

      if (!locals.user?.id || !isUserInParty(locals.user.id, partyId)) {
        throw new Error('Unauthorized');
      }
      const invitedBy = locals.user.id;

      const partyInvite = await createPartyInvite(email, partyId, invitedBy, role);

      return { success: true, partyInvite };
    } catch (error) {
      if (error instanceof UserAlreadyInvitedError || error instanceof UserAlreadyInPartyError) {
        throw new z.ZodError([
          {
            path: ['email'],
            message: error.message,
            code: 'custom',
            input: body.email
          }
        ]);
      }
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized to create scenes for this party.',
    unexpectedErrorMessage: 'An unexpected error occurred while creating the scene.'
  }
);
