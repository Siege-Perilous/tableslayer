import { getPartiesForUser } from '$lib/server';
import { getPromoUsageCount, hasUserRedeemedPromo, validatePromo } from '$lib/server/promo';
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

  // Check if promo has reached its maximum uses
  const usageCount = await getPromoUsageCount(validation.promo.id);
  if (usageCount >= validation.promo.maxUses) {
    return {
      error: 'This promo code has reached its maximum uses',
      promo: validation.promo,
      parties: []
    };
  }

  // If user is not logged in, store promo in cookie and show login/signup options
  if (!locals.user) {
    cookies.set('promo', key, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    // Store redirect URL for after login
    cookies.set('redirect_after_login', `/promo/${key}`, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 // 1 hour
    });

    return {
      promo: validation.promo,
      parties: [],
      requiresAuth: true,
      params
    };
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
