import { getPartiesForUser, getUser } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const envName = process.env.ENV_NAME || 'development';
  const fathomSiteId = process.env.FATHOM_SITE_ID || '';
  const bucketUrl = process.env.CLOUDFLARE_R2_BUCKET_URL || 'https://files.tableslayer.com';

  if (!event.locals.user) return { envName, fathomSiteId, bucketUrl };

  const userId = event.locals.user.id;
  try {
    const user = await getUser(userId);
    const parties = await getPartiesForUser(user.id);
    return {
      user,
      parties,
      envName,
      fathomSiteId,
      bucketUrl
    };
  } catch (error) {
    console.error('Error fetching user and parties', error);
    throw error;
  }
};
