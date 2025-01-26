import { type InsertParty, updatePartySchema } from '$lib/db/app/schema';
import { isUserInParty, updateParty } from '$lib/server';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

export const POST: RequestHandler = async (event) => {
  const { request, locals } = event;
  const { partyId, partyData } = (await request.json()) as {
    partyId: string;
    partyData: Partial<InsertParty>;
  };

  try {
    const parsedPartyData = updatePartySchema.parse(partyData);

    if (!locals.user.id || !isUserInParty(locals.user.id, partyId)) {
      throw error(401, 'Unauthorized request - not a member of this party.');
    }

    await updateParty(partyId, parsedPartyData);

    return json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return json(
        {
          success: false,
          status: 400,
          message: 'Validation errors occurred while updating the party.',
          errors: err.errors
        },
        { status: 400 }
      );
    }

    return json(
      {
        success: false,
        status: 500,
        message: 'An unexpected error occurred while updating the party.'
      },
      { status: 500 }
    );
  }
};
