import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
  console.log('Database on homepage', process.env.TURSO_APP_DB_URL);
  if (event.locals.user) {
    return redirect(302, '/login');
  }
  return {};
};
