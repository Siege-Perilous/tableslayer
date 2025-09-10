import { apiFactory } from '$lib/factories';
import { isAdmin } from '$lib/server/admin';
import { createPromo } from '$lib/server/promo';
import { z } from 'zod';

const validationSchema = z.object({
  key: z
    .string()
    .min(1, 'Promo key is required')
    .max(50, 'Promo key must be less than 50 characters')
    .regex(/^[a-zA-Z0-9-]+$/, 'Promo key can only contain letters, numbers, and hyphens'),
  maxUses: z.number().min(1, 'Maximum uses must be at least 1').default(1)
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }

    const adminCheck = await isAdmin(locals.user.id);
    if (!adminCheck) {
      throw new Error('Unauthorized');
    }

    const promo = await createPromo(body.key, locals.user.id, body.maxUses);

    return { success: true, promo };
  },
  {
    validationSchema,
    validationErrorMessage: 'Invalid promo key format',
    unauthorizedMessage: 'You must be an admin to create promos',
    unexpectedErrorMessage: 'Failed to create promo'
  }
);
