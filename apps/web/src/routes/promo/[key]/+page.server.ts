import { getPartiesForUser } from '$lib/server';
import { hasPromoBeenUsed, hasUserRedeemedPromo, validatePromo } from '$lib/server/promo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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

  return {
    promo: validation.promo,
    parties: eligibleParties,
    allPartiesLifetime: eligibleParties.length === 0 && parties.length > 0,
    params
  };
};
