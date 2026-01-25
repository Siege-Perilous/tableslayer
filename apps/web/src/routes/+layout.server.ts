import { getPartiesForUser, getUser, isEmailEnabled, isGoogleOAuthEnabled, isStripeEnabled } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const envName = process.env.ENV_NAME || 'development';
  const bucketUrl = process.env.CLOUDFLARE_R2_BUCKET_URL || 'https://files.tableslayer.com';
  const stripeEnabled = isStripeEnabled();
  const googleOAuthEnabled = isGoogleOAuthEnabled();
  const emailEnabled = isEmailEnabled();

  if (!event.locals.user)
    return {
      envName,
      bucketUrl,
      isStripeEnabled: stripeEnabled,
      isGoogleOAuthEnabled: googleOAuthEnabled,
      isEmailEnabled: emailEnabled
    };

  const userId = event.locals.user.id;
  try {
    const [user, parties] = await Promise.all([getUser(userId), getPartiesForUser(userId)]);
    return {
      user,
      parties,
      envName,
      bucketUrl,
      isStripeEnabled: stripeEnabled,
      isGoogleOAuthEnabled: googleOAuthEnabled,
      isEmailEnabled: emailEnabled
    };
  } catch (error) {
    console.error('Error fetching user and parties', error);
    throw error;
  }
};
