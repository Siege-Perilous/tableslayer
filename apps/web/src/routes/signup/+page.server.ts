import { getUser } from '$lib/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (process.env.ENV_NAME === 'production') {
    throw redirect(302, '/');
  }
  if (event.locals.user) {
    const userId = event.locals.user.id;
    const user = await getUser(userId);
    if (user && user.emailVerified) {
      throw redirect(302, '/');
    } else {
      throw redirect(302, '/verify-email');
    }
  }
  return {};
};
