import { getUser } from '$lib/server';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  let user = null;
  if (event.locals.user) {
    const userId = event.locals.user.id;
    user = await getUser(userId);
  }

  return {
    user
  };
}) satisfies PageServerLoad;
