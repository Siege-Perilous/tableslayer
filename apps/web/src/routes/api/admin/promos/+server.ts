import { apiFactory } from '$lib/factories';
import { isAdmin } from '$lib/server/admin';
import { getAllPromosWithRedemptions } from '$lib/server/promo';
import { z } from 'zod';

// GET endpoint doesn't need a body, but apiFactory requires a schema
const validationSchema = z.object({});

export const GET = apiFactory(
  async ({ locals }) => {
    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }

    const adminCheck = await isAdmin(locals.user.id);
    if (!adminCheck) {
      throw new Error('Unauthorized');
    }

    const promos = await getAllPromosWithRedemptions();

    return { success: true, promos };
  },
  {
    validationSchema,
    unauthorizedMessage: 'You must be an admin to view promos',
    unexpectedErrorMessage: 'Failed to load promos'
  }
);
