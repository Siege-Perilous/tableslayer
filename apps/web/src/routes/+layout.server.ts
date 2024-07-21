import { getUser } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (async (event) => {
  let user = undefined;
  if (event.locals.user) {
    const userId = event.locals.user.id;
    user = await getUser(userId);
  }

  return {
    user
  };
}) satisfies LayoutServerLoad;
