import { getPartiesForUser, getUser } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const envName = process.env.ENV_NAME || 'development';

  if (!event.locals.user) return { envName };

  const userId = event.locals.user.id;
  try {
    const user = await getUser(userId);
    const parties = await getPartiesForUser(user.id);
    return {
      user,
      parties,
      envName
    };
  } catch (error) {
    console.error('Error fetching user and parties', error);
    throw error;
  }
};
