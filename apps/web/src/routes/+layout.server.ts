import type { SelectUser } from '$lib/db/app/schema';
import { getUser } from '$lib/server';
import type { LayoutServerLoad } from './$types';

export const load = (async (event) => {
  let user;
  if (event.locals.user) {
    const userId = event.locals.user.id;
    user = (await getUser(userId)) as SelectUser;
  }

  return {
    user
  };
}) satisfies LayoutServerLoad;
