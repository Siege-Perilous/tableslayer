import { apiFactory } from '$lib/factories';
import { isAdmin } from '$lib/server/admin';
import { deletePromo } from '$lib/server/promo';
import { z } from 'zod';

const validationSchema = z.object({
  id: z.string().uuid('Invalid promo ID')
});

export const DELETE = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }

    const adminCheck = await isAdmin(locals.user.id);
    if (!adminCheck) {
      throw new Error('Unauthorized');
    }

    const success = await deletePromo(body.id);

    if (!success) {
      throw new Error('Failed to delete promo');
    }

    return { success: true };
  },
  {
    validationSchema,
    unauthorizedMessage: 'You must be an admin to delete promos',
    unexpectedErrorMessage: 'Failed to delete promo'
  }
);
