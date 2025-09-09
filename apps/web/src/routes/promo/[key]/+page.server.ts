import { getPartiesForUser } from '$lib/server';
import { hasPromoBeenUsed, hasUserRedeemedPromo, redeemPromo, validatePromo } from '$lib/server/promo';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
  const { key } = params;

  // Validate promo first
  const validation = await validatePromo(key);
  if (!validation.valid || !validation.promo) {
    return {
      error: validation.error || 'Invalid promo code',
      promo: null,
      parties: []
    };
  }

  // Check if promo has already been used by anyone
  const promoUsed = await hasPromoBeenUsed(validation.promo.id);
  if (promoUsed) {
    return {
      error: 'This promo code has already been used',
      promo: validation.promo,
      parties: []
    };
  }

  // If user is not logged in, store promo in cookie and redirect to signup
  if (!locals.user) {
    cookies.set('promo', key, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    throw redirect(302, '/signup');
  }

  // Check if user has already redeemed this promo (redundant but kept for clarity)
  const alreadyRedeemed = await hasUserRedeemedPromo(validation.promo.id, locals.user.id);
  if (alreadyRedeemed) {
    return {
      error: 'You have already redeemed this promo code',
      promo: validation.promo,
      parties: []
    };
  }

  // Get user's parties
  const parties = await getPartiesForUser(locals.user.id);

  // Filter out parties that are already on lifetime plan
  const eligibleParties = parties.filter((party) => party.plan !== 'lifetime');

  // If user has exactly one eligible party, auto-redeem
  if (eligibleParties.length === 1) {
    try {
      await redeemPromo(validation.promo.id, locals.user.id, eligibleParties[0].id);
      return {
        success: true,
        message: `${eligibleParties[0].name} has been upgraded to a lifetime plan!`,
        promo: validation.promo,
        parties: []
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to redeem promo',
        promo: validation.promo,
        parties: []
      };
    }
  }

  return {
    promo: validation.promo,
    parties: eligibleParties,
    allPartiesLifetime: eligibleParties.length === 0 && parties.length > 0
  };
};

export const actions = {
  redeem: async ({ request, locals, params }) => {
    if (!locals.user) {
      return { error: 'You must be logged in to redeem a promo' };
    }

    const formData = await request.formData();
    const partyId = formData.get('partyId') as string;

    if (!partyId) {
      return { error: 'Please select a party to upgrade' };
    }

    const validation = await validatePromo(params.key);
    if (!validation.valid || !validation.promo) {
      return { error: validation.error || 'Invalid promo code' };
    }

    try {
      await redeemPromo(validation.promo.id, locals.user.id, partyId);

      // Get party name for success message
      const parties = await getPartiesForUser(locals.user.id);
      const party = parties.find((p) => p.id === partyId);

      return {
        success: true,
        message: `${party?.name || 'Party'} has been upgraded to a lifetime plan!`
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to redeem promo'
      };
    }
  }
} satisfies Actions;
