import { apiFactory } from '$lib/factories';
import { hasUserRedeemedPromo, redeemPromo, validatePromo } from '$lib/server/promo';
import { z } from 'zod';

const validationSchema = z.object({
  key: z.string().min(1, 'Promo key is required'),
  partyId: z.string().uuid('Invalid party ID')
});

export const POST = apiFactory(
  async ({ body, locals }) => {
    if (!locals.user?.id) {
      throw new Error('Unauthorized');
    }

    // Validate promo
    const validation = await validatePromo(body.key);
    if (!validation.valid || !validation.promo) {
      throw new Error(validation.error || 'Invalid promo code');
    }

    // Check if already redeemed
    const alreadyRedeemed = await hasUserRedeemedPromo(validation.promo.id, locals.user.id);
    if (alreadyRedeemed) {
      throw new Error('You have already redeemed this promo code');
    }

    // Redeem the promo
    await redeemPromo(validation.promo.id, locals.user.id, body.partyId);

    return { success: true, message: 'Party upgraded to lifetime plan!' };
  },
  {
    validationSchema,
    validationErrorMessage: 'Invalid request',
    unauthorizedMessage: 'You must be logged in to redeem a promo',
    unexpectedErrorMessage: 'Failed to redeem promo'
  }
);
