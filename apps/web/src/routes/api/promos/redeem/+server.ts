import { apiFactory } from '$lib/factories';
import { getPartiesForUser } from '$lib/server';
import { hasPromoBeenUsed, hasUserRedeemedPromo, redeemPromo, validatePromo } from '$lib/server/promo';
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

    // Check if promo has already been used by anyone
    const promoUsed = await hasPromoBeenUsed(validation.promo.id);
    if (promoUsed) {
      throw new Error('This promo code has already been used');
    }

    // Check if already redeemed by this user
    const alreadyRedeemed = await hasUserRedeemedPromo(validation.promo.id, locals.user.id);
    if (alreadyRedeemed) {
      throw new Error('You have already redeemed this promo code');
    }

    // Redeem the promo
    await redeemPromo(validation.promo.id, locals.user.id, body.partyId);

    // Get party name for success message
    const parties = await getPartiesForUser(locals.user.id);
    const party = parties.find((p) => p.id === body.partyId);

    return {
      success: true,
      message: `${party?.name || 'Party'} has been upgraded to a lifetime plan!`
    };
  },
  {
    validationSchema,
    validationErrorMessage: 'Invalid request',
    unauthorizedMessage: 'You must be logged in to redeem a promo',
    unexpectedErrorMessage: 'Failed to redeem promo'
  }
);
