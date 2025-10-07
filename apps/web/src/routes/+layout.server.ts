import { getPartiesForUser, getUser, isGoogleOAuthEnabled, isStripeEnabled } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const envName = process.env.ENV_NAME || 'development';
  const bucketUrl = process.env.CLOUDFLARE_R2_BUCKET_URL || 'https://files.tableslayer.com';
  const stripeEnabled = isStripeEnabled();
  const googleOAuthEnabled = isGoogleOAuthEnabled();

  if (!event.locals.user) return { envName, bucketUrl, stripeEnabled, googleOAuthEnabled };

  const userId = event.locals.user.id;
  try {
    const user = await getUser(userId);
    const parties = await getPartiesForUser(user.id);
    return {
      user,
      parties,
      envName,
      bucketUrl,
      stripeEnabled,
      googleOAuthEnabled
    };
  } catch (error) {
    console.error('Error fetching user and parties', error);
    throw error;
  }
};
